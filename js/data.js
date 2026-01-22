const DATA_FILES = [
    'data/belgiumbeer.json',
    'data/deutchbeer.json',
    'data/frenchbeer.json',
    'data/nlbeer.json',
    'data/usbeer.json',
    'data/newbeer.json'
];

export async function fetchAllBeers() {
    return [{
        id: 'DEV_BEER_001',
        title: "Dev Beer",
        brewery: "Antigravity Brews",
        type: "Lager",
        alcohol: "5.0%",
        volume: "33cl",
        image: "https://placehold.co/100x200/252525/ffc107?text=Dev+Beer",
        description: "A minimal beer for a minimal dev environment."
    }];
}
