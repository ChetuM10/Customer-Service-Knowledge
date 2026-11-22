import joblib

# Path to the saved model
model_path = "models/classification_model.joblib"

# Load the model
model_bundle = joblib.load(model_path)

print("Model loaded successfully!")
print("=" * 50)

# Inspect the contents
print("Bundle type:", type(model_bundle))

print("\nAvailable keys:")
print(model_bundle.keys())

print("=" * 50)

# Extract the components
vectorizer = model_bundle["vectorizer"]
classifier = model_bundle["classifier"]
categories = model_bundle["categories"]

print("Vectorizer:", type(vectorizer))
print("Classifier:", type(classifier))

print("\nCategories:")
for category in categories:
    print("-", category)

print("\nModel classes:")
print(classifier.classes_)