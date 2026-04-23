# PRD: Mumify AI - MVP

## 1. Product Overview
**Mumify AI** is a budget-smart meal planning application designed specifically for busy mothers and pregnant women. It leverages AI to minimize food waste, optimize grocery spending, and provide specialized nutritional guidance for pregnancy.

## 2. Target Audience
- **Busy Mothers**: Looking to save time and money on meal prep.
- **Pregnant Women**: Needing easy-to-digest, nutrient-dense meal suggestions and safety warnings.
- **Budget-Conscious Families**: Aiming to reduce food waste by using what's already in the pantry.

## 3. Core Features (MVP)

### 3.1. Smart Inventory Scanner
- **Feature**: Users can scan their fridge/pantry using their device camera.
- **Functionality**: AI identifies available ingredients (fruits, vegetables, proteins, etc.) from images.
- **Benefit**: Eliminates manual data entry and provides an accurate starting point for planning.

### 3.2. AI Meal Planner
- **Feature**: Generates meal plans based on available inventory.
- **Functionality**:
    - Rationalizes plans for a Week, Month, or Trimester.
    - Suggests dishes that can be made with current ingredients.
    - Provides seasonal alternatives for missing or expensive items.
- **Benefit**: Reduces decision fatigue and optimizes ingredient usage.

### 3.3. Pregnancy Nutrition Guide
- **Feature**: Specialized meal suggestions for pregnancy.
- **Functionality**:
    - Highlights high-nutrient, easy-to-digest foods.
    - Warns against foods not suitable for pregnancy.
    - Tailors suggestions to common pregnancy needs (e.g., iron-rich, folic acid).
- **Benefit**: Ensures safety and health for both mother and baby.

### 3.4. Authentication & Authorization
- **Feature**: Secure user accounts.
- **Functionality**:
    - Google Login via Firebase Auth.
    - User-specific data storage (Inventory, Meal Plans).
- **Benefit**: Personalized experience and data persistence.

## 4. Technical Requirements
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Firebase Authentication, Firestore Database.
- **AI Engine**: Google Gemini 3 Flash (Multimodal for scanning, Text for planning).
- **Hosting**: Cloud Run (via AI Studio).

## 5. User Journey
1. **Onboarding**: User signs in via Google.
2. **Inventory**: User scans their fridge/pantry.
3. **Planning**: User selects a duration (Week/Month) and generates a plan.
4. **Guidance**: User toggles "Pregnancy Mode" for specialized advice.
5. **Execution**: User follows the generated recipes and seasonal tips.

## 6. Success Metrics
- Reduction in reported food waste.
- Time saved in meal planning.
- User engagement with pregnancy-specific content.
