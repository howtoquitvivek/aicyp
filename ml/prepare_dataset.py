import pandas as pd
import numpy as np
import os

def prepare_dataset():
    print("Loading datasets...")
    prod_df = pd.read_csv('ml/datasets/crop_production.csv')
    rec_df = pd.read_csv('ml/datasets/crop_recommendation.csv')

    # 1. Clean Production Dataset
    prod_df = prod_df.dropna(subset=['Area', 'Production'])
    prod_df = prod_df[prod_df['Area'] > 0]
    prod_df['Yield'] = prod_df['Production'] / prod_df['Area']
    
    prod_df['Crop'] = prod_df['Crop'].str.strip().str.lower()
    rec_df['label'] = rec_df['label'].str.strip().str.lower()

    # Task 1: Remove incompatible unit crops
    bad_crops = ['coconut', 'arecanut', 'cashewnut', 'black pepper', 'cardamom', 'coriander', 'garlic', 'ginger', 'turmeric', 'dry chillies', 'sweet potato', 'potato', 'onion', 'tapioca']
    prod_df = prod_df[~prod_df['Crop'].isin(bad_crops)]
    rec_df = rec_df[~rec_df['label'].isin(bad_crops)]

    # Task 5: Inject Wheat into Recommendation data if missing
    if 'wheat' not in rec_df['label'].values:
        wheat_data = {
            'N': 120, 'P': 60, 'K': 40,
            'temperature': 22.5, 'humidity': 55.0,
            'ph': 6.5, 'rainfall': 75.0,
            'label': 'wheat'
        }
        rec_df = pd.concat([rec_df, pd.DataFrame([wheat_data])], ignore_index=True)

    env_means = rec_df.groupby('label').mean().reset_index()
    env_means.rename(columns={'label': 'Crop'}, inplace=True)

    # Merge on Crop
    merged_df = pd.merge(prod_df, env_means, on='Crop', how='inner')

    # Add noise to environmental factors
    np.random.seed(42)
    noise_factor = 0.1
    for col in ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']:
        merged_df[col] = merged_df[col] * np.random.uniform(1 - noise_factor, 1 + noise_factor, len(merged_df))

    final_cols = ['State_Name', 'Season', 'Crop', 'Area', 'temperature', 'humidity', 'rainfall', 'N', 'P', 'K', 'ph', 'Yield']
    final_df = merged_df[final_cols]
    
    # Task 3: Remove biologically impossible outliers PER CROP (IQR method)
    def remove_outliers_iqr(df):
        out = []
        for crop, group in df.groupby('Crop'):
            Q1 = group['Yield'].quantile(0.25)
            Q3 = group['Yield'].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            # Also ensure yield is > 0
            filtered = group[(group['Yield'] >= max(0, lower_bound)) & (group['Yield'] <= upper_bound)]
            out.append(filtered)
        return pd.concat(out)

    final_df = remove_outliers_iqr(final_df)

    # Task 2 & 4: Produce statistics
    print("\n--- PER CROP STATISTICS ---")
    stats = final_df.groupby('Crop')['Yield'].agg(['count', 'mean', 'max']).reset_index()
    print(stats.to_string(index=False))

    os.makedirs('ml/datasets', exist_ok=True)
    final_df.to_csv('ml/datasets/final_yield_dataset.csv', index=False)
    print("\nDataset saved to ml/datasets/final_yield_dataset.csv")

if __name__ == "__main__":
    prepare_dataset()
