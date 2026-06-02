async function testGetUrls() {
    const files = [
        "File:Narendra Damodardas Modi.jpg",
        "File:Kamala Gurung Nepali Female Journalist.jpg",
        "File:Tarun J Tejpal 2007.jpg",
        "File:Juhi Smita Indian Journalist with Padmashree.jpg"
    ];

    const url = "https://commons.wikimedia.org/w/api.php?origin=*";
    
    for (const f of files) {
        const params = new URLSearchParams({
            action: "query",
            format: "json",
            prop: "imageinfo",
            titles: f,
            iiprop: "url"
        });
        const res = await fetch(`${url}&${params.toString()}`);
        const data: any = await res.json();
        const pages = data.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        console.log(f, "->", pages[pageId]?.imageinfo?.[0]?.url || "NOT FOUND");
    }
}

testGetUrls();
