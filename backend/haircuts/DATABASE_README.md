# Hairstyle Database Documentation

## File: `hairstyleDatabase.json`

This file contains your hairstyle database. Fill it with hairstyle entries following the schema below.

## Schema Structure

Each hairstyle entry must be a JSON object with these fields:

```json
{
  "name": "Hairstyle Name",
  "description": "Detailed description of the hairstyle",
  "image": "https://example.com/image.jpg",
  "faceShapes": ["oval", "round", "square"],
  "hairTypes": ["straight", "wavy"],
  "hairLength": "long",
  "gender": "female",
  "ethnicity": ["all"],
  "tags": ["professional", "trendy"],
  "ageGroups": ["adult-female", "teen-girl"]
}
```

## Field Descriptions

### Required Fields

- **name** (string): The name of the hairstyle
  - Example: `"Long Layered Waves"`

- **description** (string): Detailed description
  - Example: `"Flowing long layers with soft waves that frame the face beautifully."`

- **image** (string): URL to an image
  - **CRITICAL**: Image MUST show the face and hair clearly
  - Image should be cropped to show head/shoulders area
  - DO NOT use images that show only legs or body
  - Use verified URLs (Unsplash, Pexels, or your own hosting)
  - Example: `"https://images.unsplash.com/photo-1517363898874-7371a4d8b0d6?auto=format&fit=crop&w=800&q=80"`

- **faceShapes** (array): Compatible face shapes
  - Allowed values: `["round", "oval", "square", "heart", "diamond", "long"]`
  - Can include multiple shapes
  - **This is the STRONGEST matching factor**
  - Example: `["oval", "long", "heart"]`

- **hairTypes** (array): Compatible natural hair textures
  - Allowed values: `["straight", "wavy", "curly", "coily", "all"]`
  - Use `"all"` if the style works with any hair type
  - Example: `["straight", "wavy"]`

- **hairLength** (string): Length category
  - Allowed values: `"short"`, `"medium"`, `"long"`
  - `short`: Above shoulders
  - `medium`: Shoulder-length
  - `long`: Below shoulders

- **gender** (string): Target gender
  - Allowed values: `"male"`, `"female"`, `"unisex"`
  - Use `"unisex"` if suitable for all genders

- **ethnicity** (array): Suitable ethnicities
  - Allowed values: `["asian", "african", "caucasian", "hispanic", "middle-eastern", "mixed", "all"]`
  - Use `"all"` if the style works universally
  - Example: `["asian", "caucasian", "hispanic"]`

### Optional Fields

- **tags** (array): Style tags for filtering
  - Allowed values: `["professional", "trendy", "casual", "formal", "low-maintenance", "high-maintenance", "bold", "classic", "modern", "vintage"]`
  - Example: `["professional", "low-maintenance", "classic"]`

- **ageGroups** (array): Suitable age groups
  - Allowed values: `["child-boy", "child-girl", "teen-boy", "teen-girl", "adult-male", "adult-female"]`
  - Example: `["teen-girl", "adult-female"]`

## Matching Priority System

When recommending hairstyles, the system uses this priority order:

1. **Face Shape Compatibility** (40 points - HIGHEST PRIORITY)
   - Must match at least one face shape from `faceShapes` array
   - If no match, the hairstyle is excluded

2. **Hair Type Compatibility** (30 points)
   - Must match user's natural hair texture
   - If `hairTypes` includes `"all"`, it matches any hair type

3. **Age + Gender Suitability** (20 points)
   - Must match user's age group and gender
   - `"unisex"` gender matches all genders

4. **Ethnicity Texture Match** (15 points)
   - Should match user's ethnicity for realistic compatibility
   - `"all"` ethnicity matches everyone

5. **Visual Balance Rules** (10 points)
   - Considers face proportions and features
   - Ensures the style balances facial features

6. **Tags** (Filtering)
   - Used for additional filtering (professional, casual, etc.)

## Rules for Adding Data

1. ✅ Each entry must have all required fields
2. ✅ Image URLs MUST be verified and working
3. ✅ Images MUST show faces clearly (not cropped to show only legs/body)
4. ✅ Face shapes must be accurate - only include shapes the style actually suits
5. ✅ Hair types must reflect natural texture compatibility
6. ❌ Do NOT add placeholder data or fake URLs
7. ❌ Do NOT duplicate entries
8. ✅ Use consistent naming conventions

## Example Entry

```json
{
  "name": "Long Layered Waves",
  "description": "Flowing long layers with soft waves that frame the face beautifully. Low maintenance and works well for various face shapes.",
  "image": "https://images.unsplash.com/photo-1517363898874-7371a4d8b0d6?auto=format&fit=crop&w=800&q=80",
  "faceShapes": ["oval", "long", "heart"],
  "hairTypes": ["wavy", "straight"],
  "hairLength": "long",
  "gender": "female",
  "ethnicity": ["all"],
  "tags": ["casual", "low-maintenance", "trendy"],
  "ageGroups": ["teen-girl", "adult-female"]
}
```

## How to Fill the Database

1. Open `hairstyleDatabase.json`
2. Start with an empty array: `[]`
3. Add hairstyle objects one by one
4. Ensure all required fields are present
5. Verify all image URLs work and show faces clearly
6. Save the file
7. The system will automatically use the new data

## Output Format

When a face is analyzed, the system returns:

```json
{
  "userProfile": {
    "ageGroup": "adult-female",
    "gender": "female",
    "faceShape": "oval",
    "ethnicity": "caucasian",
    "jawShape": "round",
    "foreheadSize": "medium",
    "hairlineShape": "rounded",
    "currentHairLength": "medium",
    "hairType": "wavy",
    "hairDensity": "thick",
    "skinTone": "light",
    "faceProportions": {
      "faceLength": "medium",
      "cheekboneWidth": "medium",
      "jawWidth": "medium",
      "foreheadWidth": "medium"
    }
  },
  "recommendedStyles": [
    {
      "name": "Long Layered Waves",
      "why_it_matches": [
        "Perfect for oval face shapes",
        "Works well with wavy hair texture",
        "Suitable for female adult-female"
      ],
      "image": "https://example.com/image.jpg",
      "hairLength": "long",
      "hairType": "wavy"
    }
  ]
}
```

## Important Notes

- The database file must be valid JSON
- Do not include comments in the JSON file
- Always verify image URLs before adding
- Test the system after adding new entries
- The system will only recommend hairstyles from your database
- It will NOT generate new hairstyles or fabricate URLs



