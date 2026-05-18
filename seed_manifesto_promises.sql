-- ==============================================================================
-- PRIME MINISTER MANIFESTO TRACKER - SEED DATA (2014 BJP MANIFESTO)
-- ==============================================================================
-- Instructions: 
-- 1. Go to your Supabase Dashboard -> SQL Editor.
-- 2. Paste this entire script and click "Run".
-- 3. This will insert 13 major promises from the 2014 Manifesto as "Unclear" (Pending Evaluation).
-- 4. They will be marked as published = true so you can immediately see them on your website.
-- ==============================================================================

INSERT INTO public.manifesto_promises (title, description, source_manifesto_year, category, status, verdict_summary, announced_date, announced_situation, fulfilled_details, unfulfilled_details, published, slug)
VALUES
(
    'Track down and bring back Black Money', 
    'We will set up a Task Force to track down and bring back Black Money and proactively engage with foreign governments.', 
    2014, 
    'Economy', 
    'Partially Fulfilled', 
    'A Special Investigation Team (SIT) was immediately constituted, and automatic tax exchange treaties were signed, though direct recovery remains complex.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'A Special Investigation Team (SIT) on Black Money was constituted on the very first day of cabinet formation in May 2014. Signed key international tax compliance agreements including AEOI (Automatic Exchange of Information) and amended treaties with Switzerland and Mauritius.',
    'Despite systemic tax reporting and tracking tools, the actual net amount of offshore black money repatriated directly into public accounts remains highly contested and undisclosed.',
    true, 
    'black-money-task-force-2014'
),
(
    'Ram Temple in Ayodhya', 
    'BJP reiterates its stand to explore all possibilities within the framework of the Constitution to facilitate the construction of the Ram Temple in Ayodhya.', 
    2014, 
    'Culture & Heritage', 
    'Fulfilled', 
    'The temple was constructed following the Supreme Court''s unanimous constitutional verdict in 2019 and inaugurated in 2024.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'Following a historic unanimous constitutional verdict by the Supreme Court of India on November 9, 2019, the Central Government established the Shri Ram Janmabhoomi Teerth Kshetra Trust. Construction commenced shortly after, leading to the official consecration ceremony on January 22, 2024.',
    NULL,
    true, 
    'ram-temple-ayodhya-2014'
),
(
    'Abrogation of Article 370', 
    'BJP reiterates its stand on the Article 370, and will discuss this with all stakeholders and remains committed to the abrogation of this article.', 
    2014, 
    'Governance', 
    'Fulfilled', 
    'Article 370 was constitutionally revoked in August 2019, restructuring the state into two Union Territories.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'On August 5, 2019, Parliament passed a statutory resolution to revoke the special status of Jammu & Kashmir under Article 370. The Parliament concurrently passed the J&K Reorganisation Act, bifurcating the region into the Union Territories of Jammu & Kashmir and Ladakh.',
    NULL,
    true, 
    'abrogate-article-370-2014'
),
(
    'Uniform Civil Code', 
    'BJP believes that there cannot be gender equality till such time India adopts a Uniform Civil Code... BJP reiterates its stand to draft a Uniform Civil Code.', 
    2014, 
    'Governance', 
    'In Progress', 
    'Steps are underway at state levels (such as Uttarakhand passing the UCC in 2024), but national implementation remains under draft.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'Significant momentum has built up with the 22nd Law Commission of India actively soliciting public feedback on UCC drafts. Furthermore, Uttarakhand became the first state to officially pass and implement a Uniform Civil Code in March 2024.',
    'Drafting a singular civil code at the national level faces severe political opposition, cultural sensitivities, and debates regarding religious freedom protections in a diverse democracy.',
    true, 
    'uniform-civil-code-2014'
),
(
    '100 New Smart Cities', 
    'We will build 100 new cities; enabled with the latest in technology and infrastructure.', 
    2014, 
    'Infrastructure', 
    'Partially Fulfilled', 
    'The Smart Cities Mission upgraded existing urban infrastructure in 100 designated cities rather than constructing entirely new ones.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'The Smart Cities Mission was launched in June 2015, selecting 100 cities for urban renewal, installing integrated command centers, sustainable energy grids, smart sewage systems, and modernized transit routes.',
    'The mission transitioned from constructing 100 "new cities" to upgrading existing ones. Critics highlight significant project implementation delays, unequal fund utilization, and slow completion rates across smaller municipalities.',
    true, 
    '100-smart-cities-2014'
),
(
    'Diamond Quadrilateral Bullet Train Network', 
    'BJP will launch a Diamond Quadrilateral project - of High Speed Train network (bullet train).', 
    2014, 
    'Infrastructure', 
    'In Progress', 
    'The Mumbai-Ahmedabad bullet train corridor is under active construction, while other routes remain in pre-feasibility phases.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'Active construction is ongoing for the Mumbai-Ahmedabad High-Speed Rail corridor using Japanese Shinkansen technology. Foundations, elevated viaducts, and undersea tunnels are currently under development.',
    'High land acquisition costs, environmental clearances, and enormous financial outlays have severely delayed the original timeline. Feasibility studies for the Delhi-Kolkata and Mumbai-Chennai lines are complete but work has not begun.',
    true, 
    'diamond-quadrilateral-bullet-train-2014'
),
(
    'Price Stabilisation Fund', 
    'Setting up a Price Stabilisation Fund. Special Courts to stop hoarding and black marketing.', 
    2014, 
    'Economy', 
    'Fulfilled', 
    'The Price Stabilization Fund (PSF) was established in 2014-15 to curb inflation of essential agri-commodities.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'The PSF was set up in 2015 under the Department of Agriculture to regulate volatile prices of essential agri-horticultural commodities like onions, potatoes, and pulses through strategic buffer stocks and distribution.',
    NULL,
    true, 
    'price-stabilisation-fund-2014'
),
(
    'Housing for All by 2022', 
    'Pucca house for every Family by 2022 – equipped with the basic facilities of Toilet, Piped water supply, Electricity and proper Access.', 
    2014, 
    'Social Welfare', 
    'Partially Fulfilled', 
    'Over 40 million affordable houses were constructed under PMAY, though some rural targets were extended past the 2022 deadline.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'The Pradhan Mantri Awas Yojana (PMAY-Urban & Gramin) succeeded in sanctioning and building tens of millions of pucca homes for low-income citizens, fully integrated with Swachh Bharat toilets, Saubhagya power, and Ujjwala gas connections.',
    'While massive urban and rural housing targets were met, rural housing completions fell slightly short of the initial 2022 deadline due to supply chain disruptions and funding delays, prompting an extension to 2024.',
    true, 
    'housing-for-all-2022-2014'
),
(
    '33% Reservation for Women', 
    'BJP is committed to 33% reservation in parliamentary and state assemblies through a constitutional amendment.', 
    2014, 
    'Governance', 
    'Fulfilled', 
    'The Nari Shakti Vandan Adhiniyam was successfully passed by Parliament in September 2023.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'The Constitution (128th Amendment) Bill, or Nari Shakti Vandan Adhiniyam, was passed almost unanimously by both the Lok Sabha and Rajya Sabha in September 2023, reserving one-third of all seats in national and state assemblies for women.',
    NULL,
    true, 
    'womens-reservation-bill-2014'
),
(
    'Implementation of GST', 
    'Bring on board all State governments in adopting GST, addressing all their concerns.', 
    2014, 
    'Economy', 
    'Fulfilled', 
    'The Goods and Services Tax (GST) was officially implemented nationwide on July 1, 2017, unifying India''s tax structure.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'Through extensive negotiations with the GST Council consisting of all state finance ministers, the historic 101st Constitutional Amendment was passed. The nationwide Goods and Services Tax was officially launched at midnight on July 1, 2017.',
    NULL,
    true, 
    'implement-gst-2014'
),
(
    'One Rank One Pension (OROP)', 
    'We will implement One Rank One Pension for the armed forces.', 
    2014, 
    'Defense', 
    'Fulfilled', 
    'OROP was formally implemented in November 2015, with revised pensions and arrears distributed in subsequent phases.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'The Government formally announced the scheme details in November 2015, ensuring equal pension payout to military personnel retiring in the same rank with the same length of service. Multiple iterations and revision payouts occurred in 2022.',
    NULL,
    true, 
    'one-rank-one-pension-2014'
),
(
    'Broadband in Every Village', 
    'Broadband in every village. Wi-Fi facilities in public places and commercial centres.', 
    2014, 
    'Infrastructure', 
    'Partially Fulfilled', 
    'The BharatNet project has connected over 200,000 Gram Panchayats with high-speed fiber, though commercial village access is still expanding.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'The BharatNet project (formerly National Optical Fibre Network) was restructured and accelerated. Over 2 lakh Gram Panchayats (village councils) have been successfully linked to high-speed optical fiber infrastructure.',
    'Although the backend infrastructure has successfully reached the Gram Panchayat level in most states, the retail "last-mile" commercial broadband and Wi-Fi delivery to individual households in remote villages remains uneven.',
    true, 
    'village-broadband-wifi-2014'
),
(
    'Clean Ganga (Namami Gange)', 
    'Ensure cleanliness, purity and uninterrupted flow of the Ganga on priority.', 
    2014, 
    'Environment', 
    'Partially Fulfilled', 
    'The Namami Gange program constructed hundreds of sewage treatment plants, though ecological water purity targets remain partially met.', 
    '2014-04-07',
    'Released in the official BJP 2014 Election Manifesto in New Delhi by PM Candidate Narendra Modi.',
    'The integrated conservation mission "Namami Gange" was launched in June 2014, completing 150+ modernized sewage treatment plants (STPs), deploying river-surface trash skimmers, and setting up real-time water quality monitoring stations.',
    'While industrial pollutant discharges decreased significantly along the main stem of the river, bacterial levels (specifically fecal coliform) and ecological water flow levels in several prominent cities still do not meet swimming standards due to continuous rural domestic runoff.',
    true, 
    'clean-ganga-2014'
)
ON CONFLICT (slug) DO NOTHING;
