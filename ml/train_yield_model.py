import pandas as pd
import numpy as np
import os
import json
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_model():
    print("Loading prepared dataset...")
    df = pd.read_csv('ml/datasets/final_yield_dataset.csv')

    print(f"Dataset Shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")

    # Define features and target
    categorical_features = ['State_Name', 'Season', 'Crop']
    numerical_features = ['temperature', 'humidity', 'rainfall', 'N', 'P', 'K', 'ph']
    target = 'Yield'

    # Drop rows with missing target
    df = df.dropna(subset=[target])
    
    # Fill missing numericals with median
    for col in numerical_features:
        df[col] = df[col].fillna(df[col].median())

    # Split dataset before encoding to prevent data leakage
    X = df[categorical_features + numerical_features]
    y = df[target]

    print("Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    X_train = X_train.copy()
    X_test = X_test.copy()

    # Encode categoricals only on X_train, then transform X_test
    encoders = {}
    for col in categorical_features:
        le = LabelEncoder()
        
        # We must add 'Unknown' to the classes to handle unseen data during inference
        # We fill NaNs with 'Unknown'
        train_vals = X_train[col].fillna('Unknown').astype(str)
        test_vals = X_test[col].fillna('Unknown').astype(str)
        
        # Fit on train data
        le.fit(pd.concat([train_vals, pd.Series(['Unknown'])]))
        
        # Transform train and test
        X_train[col] = le.transform(train_vals)
        
        # For test, map unseen labels to 'Unknown'
        test_labels = test_vals.tolist()
        known_classes = set(le.classes_)
        test_labels = [label if label in known_classes else 'Unknown' for label in test_labels]
        X_test[col] = le.transform(test_labels)
        
        encoders[col] = le

    print("Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"MAE: {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"R²: {r2:.4f}")

    # Extract Feature Importances
    importances = model.feature_importances_
    feature_names = X.columns.tolist()
    importance_dict = {feat: float(imp) for feat, imp in zip(feature_names, importances)}
    
    # Sort feature importances
    importance_dict = dict(sorted(importance_dict.items(), key=lambda item: item[1], reverse=True))

    print("Saving artifacts...")
    os.makedirs('backend/app/models', exist_ok=True)
    
    with open('backend/app/models/yield_model.pkl', 'wb') as f:
        pickle.dump(model, f)
        
    with open('backend/app/models/encoders.pkl', 'wb') as f:
        pickle.dump(encoders, f)
        
    metadata = {
        "features": {
            "categorical": categorical_features,
            "numerical": numerical_features
        },
        "metrics": {
            "mae": mae,
            "rmse": rmse,
            "r2": r2
        },
        "feature_importances": importance_dict,
        "classes": {col: encoders[col].classes_.tolist() for col in categorical_features}
    }
    
    with open('backend/app/models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print("Training complete. Models and metadata saved to backend/app/models/")

if __name__ == "__main__":
    train_model()
