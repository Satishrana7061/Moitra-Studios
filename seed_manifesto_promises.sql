-- ==============================================================================
-- PRIME MINISTER MANIFESTO TRACKER - SEED DATA (2014 BJP MANIFESTO)
-- ==============================================================================
-- Instructions: 
-- 1. Go to your Supabase Dashboard -> SQL Editor.
-- 2. Paste this entire script and click "Run".
-- 3. This will insert 13 major promises from the 2014 Manifesto as "Unclear" (Pending Evaluation).
-- 4. They will be marked as published = true so you can immediately see them on your website.
-- ==============================================================================

INSERT INTO public.manifesto_promises (title, description, source_manifesto_year, category, status, verdict_summary, published, slug)
VALUES
(
    'Track down and bring back Black Money', 
    'We will set up a Task Force to track down and bring back Black Money and proactively engage with foreign governments.', 
    2014, 
    'Economy', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'black-money-task-force-2014'
),
(
    'Ram Temple in Ayodhya', 
    'BJP reiterates its stand to explore all possibilities within the framework of the Constitution to facilitate the construction of the Ram Temple in Ayodhya.', 
    2014, 
    'Culture & Heritage', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'ram-temple-ayodhya-2014'
),
(
    'Abrogation of Article 370', 
    'BJP reiterates its stand on the Article 370, and will discuss this with all stakeholders and remains committed to the abrogation of this article.', 
    2014, 
    'Governance', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'abrogate-article-370-2014'
),
(
    'Uniform Civil Code', 
    'BJP believes that there cannot be gender equality till such time India adopts a Uniform Civil Code... BJP reiterates its stand to draft a Uniform Civil Code.', 
    2014, 
    'Governance', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'uniform-civil-code-2014'
),
(
    '100 New Smart Cities', 
    'We will build 100 new cities; enabled with the latest in technology and infrastructure.', 
    2014, 
    'Infrastructure', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    '100-smart-cities-2014'
),
(
    'Diamond Quadrilateral Bullet Train Network', 
    'BJP will launch a Diamond Quadrilateral project - of High Speed Train network (bullet train).', 
    2014, 
    'Infrastructure', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'diamond-quadrilateral-bullet-train-2014'
),
(
    'Price Stabilisation Fund', 
    'Setting up a Price Stabilisation Fund. Special Courts to stop hoarding and black marketing.', 
    2014, 
    'Economy', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'price-stabilisation-fund-2014'
),
(
    'Housing for All by 2022', 
    'Pucca house for every Family by 2022 – equipped with the basic facilities of Toilet, Piped water supply, Electricity and proper Access.', 
    2014, 
    'Social Welfare', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'housing-for-all-2022-2014'
),
(
    '33% Reservation for Women', 
    'BJP is committed to 33% reservation in parliamentary and state assemblies through a constitutional amendment.', 
    2014, 
    'Governance', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'womens-reservation-bill-2014'
),
(
    'Implementation of GST', 
    'Bring on board all State governments in adopting GST, addressing all their concerns.', 
    2014, 
    'Economy', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'implement-gst-2014'
),
(
    'One Rank One Pension (OROP)', 
    'We will implement One Rank One Pension for the armed forces.', 
    2014, 
    'Defense', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'one-rank-one-pension-2014'
),
(
    'Broadband in Every Village', 
    'Broadband in every village. Wi-Fi facilities in public places and commercial centres.', 
    2014, 
    'Infrastructure', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'village-broadband-wifi-2014'
),
(
    'Clean Ganga (Namami Gange)', 
    'Ensure cleanliness, purity and uninterrupted flow of the Ganga on priority.', 
    2014, 
    'Environment', 
    'Unclear', 
    'Pending full evaluation. The reality check for this promise is currently being processed by our team.', 
    true, 
    'clean-ganga-2014'
)
ON CONFLICT (slug) DO NOTHING;
