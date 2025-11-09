function upload(path, data, size, token) {
    try{
        fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Host': 'https://content.dropboxapi.com',
                'User-Agent': 'api-explorer-client',
                'Authorization': 'Bearer '+ token,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    "path": path,
                    "mode": { ".tag": "add" },
                    "autorename": true
                }),
                'Content-Length': size
            },
            body: data
        });
        console.log('Erfolgreich gespeichert.');
    } catch(error){
        console.error('Fehler beim Speichern aufgetreten:', error);
    }
}