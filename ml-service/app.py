from flask import Flask, request, jsonify
import joblib
import os

app = Flask(__name__)

# Load the saved model
MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "models",
    "classification_model.joblib"
)

model_bundle = joblib.load(MODEL_PATH)

vectorizer = model_bundle["vectorizer"]
classifier = model_bundle["classifier"]
categories = model_bundle["categories"]

CONFIDENCE_THRESHOLD = 0.60


# Health Check API
@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "success",
        "message": "ML service is running",
        "model_loaded": True,
        "categories": categories
    }), 200


# Issue Classification API
@app.route("/predict", methods=["POST"])
def predict():

    # Read JSON request
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must contain valid JSON"
        }), 400

    # Extract ticket details
    subject = data.get("subject")
    description = data.get("description")

    # Validate data types
    if not isinstance(subject, str) or not isinstance(description, str):
        return jsonify({
            "status": "error",
            "message": "Subject and description must be strings"
        }), 400

    subject = subject.strip()
    description = description.strip()

    # Validate required fields
    if not subject or not description:
        return jsonify({
            "status": "error",
            "message": "Subject and description are required"
        }), 400

    # Combine ticket text
    input_text = subject + " " + description

    # Convert text into TF-IDF features
    features = vectorizer.transform([input_text])

    # Get prediction probabilities
    probabilities = classifier.predict_proba(features)[0]

    # Find the category with highest probability
    best_index = probabilities.argmax()

    model_category = classifier.classes_[best_index]

    confidence = float(probabilities[best_index])

    # Apply confidence threshold
    if confidence < CONFIDENCE_THRESHOLD:
        predicted_category = "Needs agent review"
    else:
        predicted_category = model_category

    # Prepare probability dictionary
    category_probabilities = {
        category: round(float(probability), 4)
        for category, probability in zip(
            classifier.classes_,
            probabilities
        )
    }

    # Return prediction
    return jsonify({
        "status": "success",
        "predicted_category": predicted_category,
        "model_category": model_category,
        "confidence": round(confidence, 4),
        "category_probabilities": category_probabilities
    }), 200


# Run Flask application
if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5001,
        debug=False
    )