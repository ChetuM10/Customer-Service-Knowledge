import joblib

# Load the trained model
model_bundle = joblib.load(
    "models/classification_model.joblib"
)

vectorizer = model_bundle["vectorizer"]
classifier = model_bundle["classifier"]
categories = model_bundle["categories"]

CONFIDENCE_THRESHOLD = 0.60

# Sample support tickets
test_tickets = [
    {
        "subject": "Unable to log in",
        "description": "I cannot access my account even after resetting my password."
    },
    {
        "subject": "Payment failed",
        "description": "My credit card payment was declined during checkout."
    },
    {
        "subject": "Suspicious email",
        "description": "I received an email asking for my banking password."
    },
    {
        "subject": "How to use the application",
        "description": "I need help understanding how to use this service."
    },
    {
        "subject": "Application crashing",
        "description": "The application crashes whenever I open the dashboard."
    }
]

print("=" * 60)
print("SUPPORT TICKET CLASSIFICATION TEST")
print("=" * 60)

for ticket in test_tickets:

    # Combine subject and description
    input_text = (
        ticket["subject"] + " " + ticket["description"]
    )

    # Convert text into TF-IDF features
    input_features = vectorizer.transform([input_text])

    # Predict category
    prediction = classifier.predict(input_features)[0]

    # Get probabilities for all categories
    probabilities = classifier.predict_proba(input_features)[0]

    # Find the highest probability
    best_index = probabilities.argmax()
    confidence = probabilities[best_index]

    # Apply confidence threshold
    if confidence < CONFIDENCE_THRESHOLD:
        final_result = "Needs agent review"
    else:
        final_result = prediction

    print("\nSubject:", ticket["subject"])
    print("Description:", ticket["description"])
    print("Model Prediction:", prediction)
    print("Confidence:", f"{confidence:.2%}")
    print("Final Result:", final_result)

    print("\nCategory Probabilities:")

    for category, probability in zip(
        classifier.classes_, probabilities
    ):
        print(f"  {category}: {probability:.2%}")

    print("-" * 60)