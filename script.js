const CLIENT_ID = "0b60fad78afb40d0afa8fc0832bfc4f2";
const CLIENT_SECRET = "8cea068e20d7408785bc320466a4f6b2";

let accessToken = '';
let currentSearchType = "track";

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('erroeMessage');
const results = document.getElementById('results');
const resultsTitle = document.getElementById('resultsTitle');
const resultsGrid = document.getElementById('resultsGrid');
const tabBtns = document.querySelectorAll('.tab-btn');

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e)=>{
    if(e.key === 'Enter'){
        performSearch();
    }
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSearchType = btn.dataset.type;
        if(searchInput.value.trim()){
            performSearch();
        }
    })
})

async function getAccessToken(){
    if(CLIENT_ID === 'VOTRE_CLIENT_ID'|| CLIENT_SECRET  === 'VOTRE_CLIENT_SECRET'){
        throw new Error('Vous devez configurer vos clés Clients et secrete Spotify');
    }
    try{
        const reponse = await fetch ('https://accounts.spotify.com/api/token',{
            method: 'POST',
            headers:{
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        });
        if(!reponse.ok){
            throw new Error('Erreur authentification Spotify');
        }
        const data = await reponse.json();
        accessToken = data.access_token;
        console.log('Token Spotify Obtenu!');
    }

    catch(err){
        throw new Error('Impossible de sautenfifier avec Spotify' + err.message);
    }
}


async function performSearch(){
    const query = searchInput.value.trim();

    if(!query){
        showError('Veuillez entrer une recherche');
        return;
    }
    showLoading();
    hideError();
    hideResults();

    try{
        if(!accessToken){
            await getAccessToken();
        }
        
        const searchResult = await searchSpotify(query, currentSearchType);

        displayResults(searchResult, currentSearchType);
    }

    catch(err){
        showError(err.message)
        } finally{
            hideLoading();
        };
}

async function searchSpotify(query, type) {
	// Encodage des caractères pour les rendre surs dans l'URL
	const encodedQuery = encodeURIComponent(query);
	// Construction de l'url de l'API de recherche
	const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=${type}&limit=20&market=FR`;

	// Bloc try catch pour gérer les erreurs d'API
	try {
		const response = await fetch(url, {
			// On précise le type de méthode (GET parce qu'on demande des données au serveur)
			method: 'GET',

			// Configuration de l'en-tête d'autorisation
			headers : {
				'Authorization': 'Bearer ' + accessToken
			}
		});

		// Vérifier si la réponse HTTP n'est pas ok
		if(!response.ok) {
			// Si statut 401 (non authorisé)
			if(response.status === 401) {
				// Je demande un nouveau token
				await getAccessToken();
				// Appel de la fonction avec notre nouveau token
				return searchSpotify(query, type);
			}
			// Ici message d'erreur pour les autres types d'erreur (400, 403, 404, 500)
			throw new Error(`Erreur de l'API de Spotify: ${response.status}`);
		}

		// Conversion de la réponse en JSON
		const data = await response.json();
		// retourner les résultats de recherche
		return data;

	} catch(err) {
		throw new Error('Erreur lors de la recherche: ' + err.message);
	}
}


// ### **ÉTAPE 7 : Fonction d'affichage des résultats**
function displayResults(data, type) {
	let items = [];
	let title = '';

	// Swicth permettant d'extraire les données selon le type de recherche
	switch(type) {
		// Si musique
		case 'track':
			// Extraction des titres ou tableau vide si inexistant
			items = data.tracks?.items || [];
			// Création du titre et nombre de résultats
			title = `${items.length} titres trouvés`;
			break;

		// Si artiste
		case 'artist': 
			items = data.artists?.items || [];
			title = `${items.length} artistes trouvés`;
			break;

		// Si album
		case 'album': 
			items = data.albums?.items || [];
			title = `${items.length} albums trouvés`;
			break;
	}
	resultsTitle.textContent = title;
    resultsGrid.innerHTML = '';

    if(items.length === 0){
        resultsGrid.innerHTML = '<p style="color: #b3b3b3; text-align: center; grid-colomn:1/-1">Aucun résultat trouvé</p>'
    } else{
        items.forEach(item => {
            const card = createResultCard(item, type);
            resultsGrid.appendChild(card);
        });
    }
    showResults();
}

function createResultCard(item, type){
    const card = document.createElement('div');
    card.className = 'result-card';
    let image = '';
    let title = '';
    let subtitle = '';
    let popularity = '';

    switch(type){
        case 'track':
            image = item.album?.images?.[0]?.url || 'https://via.placeholder.com/640x640';
            title = item.name;
            subtitle = item.artists?.map(artist => artist.name).join(',') || 'Artiste inconnu';
            popularity = item.popularity? `Popularite: ${item.popularity}%`:'';
            break;

        case 'artist':
            image = item.images?.[0]?.url || 'https://via.placeholder.com/640x640';
            title = item.name;
            subtitle = `${item.followers?.total?.toLocaleString() || 0} abonnés`;
            popularity = item.popularity? `Popularite: ${item.popularity}%`:'';
            break;

        case 'album':
            image = item.images?.[0]?.url || 'https://via.placeholder.com/640x640';
            title = item.name;
            subtitle =  item.artists?.map(artist => artist.name).join(',') || 'Artiste inconnu';
            popularity = item.release_date ? `Album sorti en ${new Date( item.release_date).getFullYear()}`:'';
            break;
    } 

    card.innerHTML = `
    <div class="card-image">
    <img src = "${image}" alt = "${title}" loading = "lazy">
    </div>
    <div class="card-info">
    <h3>${title}</h3>
    <p>${subtitle}</p>
    ${popularity ? `<div class="popularity">${popularity}</div>` : ''}
    </div>
    `;

    card.addEventListener('click', (e) => {
        window.open(item.external_urls?.spotify, '_blank');
    });

    return card;

}

function showLoading(){
    loading.classList.remove('hidden');
}

function hideLoading(){
    loading.classList.add('hidden');
}

function showError(message){
    errorMessage.textContent = message;
    error.classList.remove('hidden');
}

function hideError(){
    error.classList.add('hidden');
}

function showResults(){
    results.classList.remove('hidden');
}

function hideResults(){
    results.classList.add('hidden');
}