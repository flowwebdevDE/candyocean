// Hier Produkte bearbeiten/hinzufügen
const products = [
    {
        id: 1,
        name: "Regenbogen Lollys",
        price: 4.99,
        originalPrice: 5.99, // SALE
        category: "Lutscher",
        description: "Handgemachte Lutscher in bunten Farben.",
        image: "https://i.ebayimg.com/images/g/oToAAOSww6NhWoaQ/s-l1200.jpg"
    },
    {
        id: 2,
        name: "Saure Apfelringe",
        price: 2.50,
        category: "Fruchtgummi",
        description: "Extra sauer und fruchtig im Geschmack.",
        image: "https://suessigkeiten-shop.com/cdn/shop/files/8447_a_43235_931ad9db-5436-4fb1-8585-dbe8fdad45b9.webp?v=1755186082&width=1445"
    },
    {
        id: 3,
        name: "Schoko-Trüffel Box",
        price: 12.90,
        originalPrice: 15.90, // SALE
        category: "Schokolade",
        description: "Feinste Pralinen, gefüllt mit Nougat.",
        image: "https://www.heimgourmet.com/media/schokotruffel-jpg_crop.jpeg/rh/schokotruffel.jpg"
    },
    {
        id: 4,
        name: "Gummibärchen Mix",
        price: 3.99,
        category: "Fruchtgummi",
        description: "Der Klassiker in allen Farben und Formen.",
        image: "https://www.grizly.de/fruchtgummi-mix-img-grizly~~mlsani~~mix-ovocneho-zele~~8595678428215_00-fd-3.webp"
    },
    {
        id: 5,
        name: "Cola Fläschchen",
        price: 1.99,
        category: "Fruchtgummi",
        description: "Spritziger Cola-Geschmack zum Kauen.",
        image: "https://m.media-amazon.com/images/I/61k+f+y+L+L._AC_UF1000,1000_QL80_.jpg"
    },
    {
        id: 6,
        name: "Edel-Zartbitter",
        price: 2.49,
        category: "Schokolade",
        description: "70% Kakao für echte Genießer.",
        image: "https://www.rittersport.com/data/global/flavor_stage/2022/RS_22_Stage_Range_100g_Halbbitter_mobile.png"
    },
    {
        id: 7,
        name: "Sahne-Karamell",
        price: 3.49,
        category: "Bonbons",
        description: "Weiche Sahnekaramellen, die auf der Zunge zergehen.",
        image: "https://img.chefkoch-cdn.de/rezepte/163361071063077/bilder/1312986/crop-960x720/sahne-karamell-bonbons.jpg"
    },
    {
        id: 8,
        name: "XXL Lolly",
        price: 6.99,
        category: "Lutscher",
        description: "Ein riesiger Lutscher für langen Genuss.",
        image: "https://m.media-amazon.com/images/I/61J6y+g+L+L._AC_UF1000,1000_QL80_.jpg"
    }
];

// Gültige Gutscheincodes
const discountCodes = {
    'CANDYOCEAN2026': { type: 'percent', value: 0.10 }, // 10% Rabatt
    'HALLOWELT5': { type: 'fixed', value: 5.00 }        // 5€ Rabatt
};

// Versandkosten berechnen
function getShippingCost(country) {
    if (country === 'DE') return 4.99;
    if (country === 'AT') return 9.99;
    if (country === 'CH') return 14.99;
    return 19.99;
}