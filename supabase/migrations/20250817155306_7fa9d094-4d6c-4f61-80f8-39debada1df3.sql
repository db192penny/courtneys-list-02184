-- Update Earth and Turf with sample Google data to test the system
UPDATE vendors 
SET 
  google_place_id = 'ChIJeRpOeF652YgRkDrfT6HpCi0',  -- Sample place ID for testing
  google_rating = 4.8,
  google_rating_count = 25,
  google_reviews_json = '[
    {
      "author_name": "John Smith",
      "rating": 5,
      "text": "Excellent landscaping service! They transformed our backyard into a beautiful oasis. Professional team and great communication throughout the project.",
      "time": 1640995200,
      "relative_time_description": "2 months ago"
    },
    {
      "author_name": "Sarah Johnson", 
      "rating": 5,
      "text": "Earth & Turf did an amazing job with our landscape design. Highly recommend their services for anyone looking for quality work.",
      "time": 1638316800,
      "relative_time_description": "3 months ago"
    },
    {
      "author_name": "Mike Davis",
      "rating": 4,
      "text": "Great work on our lawn maintenance. They are reliable and professional. The only minor issue was scheduling but overall very satisfied.",
      "time": 1635638400,
      "relative_time_description": "4 months ago"
    }
  ]'::jsonb,
  google_last_updated = now()
WHERE id = 'f375aef5-ba9f-49f9-b850-559801b2ed8d';