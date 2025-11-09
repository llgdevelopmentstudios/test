//Datei als z.b.: document.getElementbyId('ID').file[0]
async function sendMessage(webhooklink, nachricht, datei) {
  const webhookUrl = webhooklink;
  const content = nachricht;

  const formData = new FormData();
  formData.append('content', content);

  // Überprüfe, ob eine Datei vorhanden ist
  if (datei) {
      formData.append('file', datei);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log('Nachricht erfolgreich gesendet');
    } else {
      console.error('Fehler beim Senden der Nachricht:', response.statusText);
    }
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
  }
}

