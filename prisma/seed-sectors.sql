-- Insert sample sectors for STK interest areas
INSERT INTO "Sector" (id, name, code, description, "createdAt", "updatedAt")
VALUES
    ('sec_education', 'Eğitim', 'EDU', 'Eğitim alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_health', 'Sağlık', 'HEA', 'Sağlık alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_environment', 'Çevre', 'ENV', 'Çevre koruma alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_social', 'Sosyal Yardım', 'SOC', 'Sosyal yardım alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_culture', 'Kültür-Sanat', 'CUL', 'Kültür ve sanat alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_sports', 'Spor', 'SPO', 'Spor alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_youth', 'Gençlik', 'YOU', 'Gençlik alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_women', 'Kadın Hakları', 'WOM', 'Kadın hakları alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_children', 'Çocuk Hakları', 'CHI', 'Çocuk hakları alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_disability', 'Engelli Hakları', 'DIS', 'Engelli hakları alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_animals', 'Hayvan Hakları', 'ANI', 'Hayvan hakları alanında faaliyet gösteren STKlar', NOW(), NOW()),
    ('sec_technology', 'Teknoloji', 'TEC', 'Teknoloji alanında faaliyet gösteren STKlar', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
