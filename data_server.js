const express = require('express');
const archiver = require('archiver');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // Das fs-Modul wird für das Lesen des Verzeichnisinhalts benötigt
const { error } = require('console');
//const sharp = require('sharp');
//const { createCanvas, loadImage } = require('canvas');
const os = require('os');

const app = express();
//const port = process.env.PORT || 3000;
const port = ['3000', '80'];
const IP = "192.168.0.21";
const jsonFilePath = 'userdata.json';
var zähler = 0;
var gloabl_chat_json = "chats/global/messages.json";
var max_nachrichten = 500;
// Aktivieren Sie CORS für alle Anfragen
app.use(cors());

// Standardroute, um die HTML-Datei zu laden
app.get('/', (req, res) => {
  var datum = new Date();
  const ip = req.ip || req.connection.remoteAddress;
  var newItem = {
    time: datum,
    aktion: 'neuer Seitenaufruf',
    ip_adress: ip
  }
  var htmlseite = fs.readFileSync('webseite.html', 'utf8')
  res.send(htmlseite); // Pfad zur HTML-Datei anpassen
  console.log("Neuer Seitenauruf");
  updateJSONFile(`logs/seitenaufrufe.json`,newItem);
});
app.get('/webseite_logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'webseite_logo.png')); // Pfad zur HTML-Datei anpassen
});

app.use('/profilbilder/*', (req, res, next) => {
  const imagePath = path.join(__dirname, req.url);
  // Überprüfe, ob das Bild existiert
  fs.access(imagePath, fs.constants.F_OK, (err) => {
      if (err) {
          // Bild existiert nicht, lade das Standardbild
          const defaultImagePath = path.join(__dirname, '/default images/default profilepicture.png');
          fs.createReadStream(defaultImagePath).pipe(res);
      } else {
          // Bild existiert, lade es normal
          res.sendFile(imagePath);
      }
  });
});



// Speicherort festlegen (Verzeichnis) - ändere diesen Pfad entsprechend deiner Anforderungen
var uploadDirectory = 'uploads';
var uploadDirectory_pb = 'profilbilder'
var api_directory = 'apis';

// Konfigurieren Sie Multer, um Dateien zu speichern
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    uploadDirectory = "uploads/" + req.headers['key1'];
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    var date = Date.now();
    cb(null, `${date}${path.extname(file.originalname)}`);
  },
});

var upload = multer({ storage });

// Statische Dateien im "uploads"-Verzeichnis verfügbar machen
app.use('/uploads', express.static(uploadDirectory));

// Route zum Hochladen von Dateien
app.post('/upload', get_header, upload.single('file'), (req, res) => {
  // Der Upload der Datei erfolgt innerhalb des Middleware-Handlers
  res.json({ message: 'Datei erfolgreich hochgeladen.' });
});


app.use('/apis', express.static(api_directory));
app.use('/profilbilder', express.static(uploadDirectory_pb));

app.post('/upload_pf', get_header, (req, res) => {
  try{

  var date = Date.now();
  var json_data = readAndParseJSONFile(jsonFilePath);
  json_data.forEach((data)=>{
    if (data.user_key == req.headers['key1'] && data.profilebild !== "" && data.profilebild !== undefined) {
      var profilepicture_path = data.profilebild;
      //profilepicture_path = profilepicture_path.replace("/low_res","");
      deleteFile( __dirname + profilepicture_path);
      //console.log(data.user_key, data.profilebild, data);
    }
  });
  const storage2 = multer.diskStorage({
    destination: function (req, file, callback) {
      // Überprüfe, ob das Upload-Verzeichnis existiert, andernfalls erstelle es
      const uploadDirectory = './profilbilder'; // Speicherort wie im ersten Skript
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdir(uploadDirectory, function(err) {
          if (err) {
            console.error(err);
            callback(err);
          } else {
            callback(null, uploadDirectory);
          }
        });
      } else {
        callback(null, uploadDirectory);
      }
    },
    filename: function (req, file, callback) {
      //const date = Date.now();
      const datei_endung2 = path.extname(file.originalname);
      const dateiname = `${date}${datei_endung2}`;
      callback(null, dateiname);
    },
  });
  var upload2 = multer({ storage : storage2 }).single('file');
  upload2(req, res, function (err) {
    const datei_endung2 = path.extname(req.file.originalname);
    ändere_einzelnes_json('userdata.json', '/profilbilder/' + date + datei_endung2, req.headers['key1']);
    res.json({ message : 'Profilbild hochgeladen', link: '/profilbilder/' + date + datei_endung2 });
    //console.log("Profilbild hochgeladen", datei_endung2);
  });
} catch(error){
  console.error(error);
  return res.status(500).json({ error: 'Serverfehler' });
}
});


// Route zum Abrufen der Dateien im "uploads"-Verzeichnis als Links
app.get('/get_data', get_header, (req, res) => {
  const uploadsDirectory = path.join(__dirname, 'uploads/' + req.headers['key1']);

  // Lesen Sie den Inhalt des "uploads"-Verzeichnisses
  fs.readdir(uploadsDirectory, (err, files) => {
    if (err) {
      console.error('UserKey:',req.headers['key1'], 'Key:', req.headers['key'],'headers:',req.headers,'Fehler beim Lesen des Verzeichnisses:', err);
      return res.status(500).json({ error: 'Serverfehler' });
    }

    // Erstellen Sie Links für jede Datei im "uploads"-Verzeichnis
    const fileLinks = files.map((file) => {
      return `/uploads/${req.headers['key1']}/${file}`;
    });

    // Senden Sie die Liste der Dateilinks als JSON-Antwort
    res.json({ fileLinks });
  });
});

//Low Res entfernt

app.get('/get_usernames', get_header, (req, res)=>{
  var userdata = readAndParseJSONFile(jsonFilePath);
  let usernames = []
  let profilepictures = [];
  let bio = [];
  try{
  userdata.forEach((data)=>{
    usernames.push(data.username);
    profilepictures.push(data.profilebild);
    bio.push(data.bio);
  });
  res.json({ message:"Nutznamen geladen", nutzernamen: usernames, profilbilder: profilepictures, bio_text: bio})
  }catch(error){
    console.error(error);
    res.status(500).json({message: "Fehler beim laden der Nutzernamen"})
  }
});

app.get('/get_custom_user', get_header, (req, res)=>{
  var user = req.headers['user_'];
  var rawdata = readAndParseJSONFile('userdata.json');
  let userdata;
  try {
    rawdata.forEach((data)=>{
      if (data.username == user) {
        userdata = {
          username: data.username,
          bio: data.bio,
          profilbild: data.profilebild
        };
        //console.log(userdata);
      }
    })
    res.json({message: `Nutzerdaten von ${user} erfolgreich empfangen`, userdata_: userdata}) 
  } catch (error) {
    res.status(500).json({message: "Servererror"});
    console.error(error)
  }
})

app.get('/gloabl_chat', get_header, (req, res) =>{
  var chat_data = readAndParseJSONFile(gloabl_chat_json);
  res.json({message: "Chat geladen",chat: "global", chat_data})
});
app.use('/chats', express.static("./chats/"));
app.post('/send_message', get_header, (req, res) => {
  try {
    const nutzername = req.headers['user'];
    var profilbild = "";
    var userdata = readAndParseJSONFile(jsonFilePath);
    userdata.forEach((data) =>{
      if (data.username == nutzername) {
        profilbild = data.profilebild;
      }
    })
    const zeit = new Date();
    const chat = req.headers['chat_'];
    const newItem = {
      image: "",
      message: req.headers['message'],
      user: nutzername,
      profilepicture: profilbild,
      time: zeit
    };
    const chat_data = readAndParseJSONFile(`chats/${chat}/messages.json`);

    const storage2 = multer.diskStorage({
      destination: function (req, file, callback) {
        const uploadDirectory3 = `./chats/${chat}/`; // Speicherort wie im ersten Skript
        if (!fs.existsSync(uploadDirectory3)) {
          fs.mkdir(uploadDirectory3, function (err) {
            if (err) {
              console.error(err);
              callback(err);
            } else {
              callback(null, uploadDirectory3);
            }
          });
        } else {
          callback(null, uploadDirectory3);
        }
      },
      filename: function (req, file, callback) {
        const datei_endung2 = path.extname(file.originalname);
        const dateiname = `${zeit.getTime()}${datei_endung2}`;
        callback(null, dateiname);
      },
    });

    const upload2 = multer({ storage: storage2 }).single('file');

    upload2(req, res, function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ message: "Fehler beim Upload der Datei!" });
      } else {
        if (req.file) {
          const datei_endung2 = path.extname(req.file.filename);
          newItem.image = `/chats/${chat}/${req.file.filename}`;
        }
        updateJSONFile(`chats/${chat}/messages.json`, newItem);
        res.json({ message: "Nachricht gesendet.", chat_data });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Fehler beim senden!" });
  }
});

app.post('/send_message_without_data', get_header, (req, res) =>{
  try{
    const nutzername = req.headers['user'];
    var profilbild = "";
    var userdata = readAndParseJSONFile(jsonFilePath);
    userdata.forEach((data) =>{
      if (data.username == nutzername) {
        profilbild = data.profilebild;
      }
    })
    var zeit = new Date();
  var chat = req.headers['chat_'];
  var newItem = {
    image: "",
    message: req.headers['message'],
    user: nutzername,
    profilepicture: profilbild,
    time: zeit
  };
    var chat_data = readAndParseJSONFile(`chats/${chat}/messages.json`)
    updateJSONFile(`chats/${chat}/messages.json`,newItem);
    res.json({message: "Nachricht gesendet.", chat_data})
  }catch(error){
    console.error( error);
    res.status(500).json({message: "Fehler beim senden!"})
  }
})

app.get('/get_chatdata', get_header, (req, res)=>{
  try{
    var zeit = new Date();
    var chat = req.headers['chat_'];
    var chat_data = readAndParseJSONFile(`chats/${chat}/messages.json`)
    res.json({message: `${zeit}: Nachrichten geladen.`, chat_data})
  }catch(error){
    console.error(error);
    res.status(500).json({message: "Fehler beim laden der Nachrichten!"});
  }
})

app.post('/start_chat', get_header, (req, res)=>{
  var user = readAndParseJSONFile('chats.json');
  var start_user = req.headers['start_user'];
  var other_user = req.headers['other_user'];
  var foldername_2 = getRandomArbitrary(10000000, 999999999) + 'chat';
  const folderName = `chats/${foldername_2}`; // Der Name des neuen Ordners
  var filePath = folderName + '/messages.json'
  var fileContent = [{
    image: "",
    message: `Willkommen im Chat mit ${start_user} und ${other_user}!`,
    user: "Server",
    time: new Date()
  }];
  
  // Erstelle den Ordner
  fs.mkdir(folderName, { recursive: true }, (err) => {
    if (err) {
      console.error(`Fehler beim Erstellen des Ordners: ${err}`);
    } else {
      console.log(`Der Ordner "${folderName}" wurde erfolgreich erstellt.`);
    }
  });
  try{
    console.log(start_user, other_user);
    var neuer_chat_speicher ={
      user: [
        start_user,
        other_user
      ],
      chatname: foldername_2
    }
    user.push(neuer_chat_speicher);
    console.log(user);
    var neuer_chat_speicher_json = JSON.stringify(user);
      fs.writeFile('chats.json', neuer_chat_speicher_json, (err) => {
        console.log(`Chat gespeichert`);
      });

      fileContent_json = JSON.stringify(fileContent);
      fs.writeFile(filePath, fileContent_json, (err) => {
        console.log(`Chatdatei erstellt`);
      });
      res.json({message: "Chat erfolgreich erstellt!"})
    } catch (error) {
      res.status(500).json({message: "Fehler beim Chaterstellen"})
      console.error('Fehler beim Erstellen des Chats: ', error);
    }
});

app.get('/load_chat', get_header, (req, res)=>{
  var chat = req.headers['chat'];
  var filepath_ = `chats/${chat}/messages.json`;
  var chat_data = readAndParseJSONFile(filepath_);
  res.json({message: "Chat geladen", chat_data})
})

app.get('/get_all_chats', get_header, (req, res)=>{
  try{
  var user_key = req.headers['key1'];
  var chatdata = readAndParseJSONFile('chats.json');
  var userdata = readAndParseJSONFile(jsonFilePath);
  var username = "";
  var chats = [];
  userdata.forEach((data)=>{
    if (data.user_key) {
      username = data.username;
      return;
    }
  })
  chatdata.forEach((data)=>{
    var usernames = data.user;
    usernames.forEach((data2)=>{
      if (data2 == username) {
        chats.push(data.chatname);
      }
    })
  })
  res.json({message: "Erfolgreich alle Chatdaten geladen", chatdata: chats});
  }catch (error){
    console.error(error);
  }
})


// Route zum Hochladen einer Datei ins Verzeichnis der Node.js-Anwendung
app.post('/upload_new_version',get_header, upload.single('file'), (req, res) => {
  if (!req.file) {
    console.log("keine Datei hochgeladen");
    return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  }

  const uploadedFileName = req.file.filename;
  const uploadedFilePath = path.join(__dirname, uploadedFileName);

  // Hier können Sie weitere Verarbeitungsschritte für die hochgeladene Datei durchführen,
  // z.B. speichern, verarbeiten oder umbenennen.

  res.json({ message: 'Datei erfolgreich hochgeladen.', filename: uploadedFileName });
});



app.get('/get_userdata', get_header, (req, res) =>{
  console.log("Neuer Zugriff auf Nutzerdaten.")
  var your_key = req.headers['key1'];
  var userdata_all = readAndParseJSONFile(jsonFilePath);
  userdata_all.forEach((your_userdata) =>{
    if (your_userdata.user_key == your_key) {
      res.json({message: "Benutzerdaten gefunden", your_userdata})
    }
  });
});



// Beispielroute, die den Header erfordert
app.post('/login',get_header, (req, res) => {
  const jsonContent = readAndParseJSONFile(jsonFilePath);
  var username_client = req.headers['username'];
  var password_client = req.headers['password'];
  if (jsonContent) {
    //console.log(jsonContent);
    zähler = 0;
    while (zähler <= jsonContent.length - 1) {
      if (username_client == jsonContent[zähler].username && password_client == jsonContent[zähler].password) {
        if (jsonContent[zähler].profilebild !== "") {
          res.json({message: "Erfolgreich angemeldet", user_key: jsonContent[zähler].user_key, profilebild: jsonContent[zähler].profilebild});          
        } else{
          res.json({message: "Erfolgreich angemeldet", user_key: jsonContent[zähler].user_key});
        }
        //console.log({message: "Erfolgreich angemeldet"});
        return
      }
      zähler += 1;
    }
    res.json({message: "Anmeldedaten falsch"});
    //console.log("Ameldedaten falsch");
  } else {
    console.log(error);
  }
});




app.post('/update_userdata', get_header, (req, res)=>{
  const jsonContent = readAndParseJSONFile(jsonFilePath);
  if (jsonContent) {
    //console.log(jsonContent);
    zähler = 0;
    while (zähler <= jsonContent.length - 1) {
      if (req.headers['username'] == jsonContent[zähler].username) {
        res.json({message: "Benutzername vergeben"});
        //console.log({message: "Benutzername vergeben", nutzername: req.headers['username']});
        return
      } else if (req.headers['email'] == jsonContent[zähler].email) {
        res.json({message: "Emailadresse vergeben"});
        //console.log({message: "Emailadresse vergeben", email: req.headers['email']});
        return
      }
      zähler += 1;
    }
    var user_key = getRandomArbitrary(1000000, 9000000);
    neuer_ordner(user_key);
    const newItem = {
      username: req.headers['username'],
      password: req.headers['password'],
      email: req.headers['email'],
      bio: '',
      user_key: user_key
    };
    updateJSONFile(jsonFilePath, newItem);
    res.json({ message: 'Erledigt!'});
    console.log({message: "Neuer Account erstellt", nutzername: req.headers['username'], email: req.headers['email']})
  } else {
    var user_key = getRandomArbitrary(100000000, 999999999);
    neuer_ordner(user_key);
    const newItem = {
      username: req.headers['username'],
      password: req.headers['password'],
      email: req.headers['email'],
      bio: '',
      user_key: user_key
    };
    updateJSONFile(jsonFilePath, newItem);
    res.json({ message: 'Erledigt!'});
    console.log({message: "Neuer Account erstellt", nutzername: req.headers['username'], email: req.headers['email']})
  }
});
app.use(function(req, res, next){
  if (req.is('text/*')) {
    req.text = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk){ req.text += chunk });
    req.on('end', next);
  } else {
    next();
  }
});
app.post('/save_bio', get_header, (req, res)=>{
  var bio_text = req.text;
  var userkey = req.headers['key1'];
  speicher_bio(bio_text, userkey);
  res.json({message: "Erfolgreich gespeichert"});
})
function speicher_bio(bio_text, user_key) {
  fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen der JSON-Datei: ', err);
      return;
    }
  
    try {
      // Parsen der JSON-Daten
      const jsonData = JSON.parse(data);
  
      // Füge das "profilebild"-Feld zum ersten Objekt hinzu (Index 0)
      jsonData.forEach((data)=>{
        if (data.user_key == user_key) {
         data.bio = bio_text;
      // Konvertiere die aktualisierten Daten zurück in JSON
      const updatedJson = JSON.stringify(jsonData, null, 2);
  
      // Schreibe die aktualisierten Daten zurück in die Datei
      fs.writeFile(jsonFilePath, updatedJson, (err) => {
        if (err) {
          console.error('Fehler beim Schreiben der JSON-Datei: ', err);
        } else {
          console.log('Die JSON-Datei wurde erfolgreich aktualisiert.');
        }
      }); 
        }
      })
    } catch (error) {
      console.error('Fehler beim Parsen der JSON-Daten: ', error);
    }
  });
}


app.post('/delete_pb', get_header, (req, res)=>{
  var userkey = req.headers['key1']
  var jsondata = readAndParseJSONFile(jsonFilePath);
  jsondata.forEach((data) =>{
    if (data.user_key == userkey) {
      try{
        deleteFile(__dirname + data.profilebild);
        ändere_einzelnes_json('userdata.json', '', req.headers['key1'])
        res.json({message: "Profilbild erfolgreich gelöscht."})
      } catch (error){
        res.status(500).json({message: "Fehler beim löschen des Profilbild"});
      }
    }
  })
})

app.post('/delete_all_data', get_header, async (req, res) => {
  const uploadsDirectory = path.join(__dirname, 'uploads/' + req.headers['key1']);

  try {
    // Lesen Sie den Inhalt des "uploads"-Verzeichnisses
    const files = await fs.promises.readdir(uploadsDirectory);

    // Erstellen Sie Links für jede Datei im "uploads"-Verzeichnis
    const fileLinks = files.map((file) => {
      return path.join(uploadsDirectory, file); // Vollständiger Pfad zur Datei
    });
    fileLinks.forEach((dataURL) =>{
        deleteFile(dataURL);
    })
    // Rückgabe einer Erfolgsmeldung
    res.json({ message: `Alle Dateien von ${req.headers['username']} gelöscht.` });
    res.status(204);

  } catch (err) {
    console.error('Fehler beim Lesen/Löschen des Verzeichnisses:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});


app.post('/delete_file', get_header, (req, res)=>{
  try{
    deleteFile(__dirname + req.headers['file_path']);
    setTimeout(() => {
      res.json({message: "Löschen der Datei " + req.headers['file_path'] + " erfolgreich."});
    }, 250);
  } catch (error) {
    console.error(error);
    console.error(err.stack)
    res.status(500).json({message: "Löschen der Datei nicht möglich."})
  }
});

//wichtiger schutz
app.get('/userdata.json', (req, res) => {
  if (req.headers['key'] == "admin_code_tadkjhquezruerzpsuifhdgasaushduihdiuhdckvjnsdcjnsdöfkjsdhöfkjdhsfsdjkfh") {
    res.sendFile(path.join(__dirname, 'userdata.json'));
    console.warn("ACHTUNG! Jemand greift auf ALLE Nutzerdaten zu!!");
  } else{
    res.status(401).json({ error: 'Ungültiger Header.' });
  }
});

app.get('/download', (req, res) => {
  const folderPath = './uploads/' + req.headers['key1']; // Pfad zu deinem Ordner
  const zipFileName = 'archive.zip';
  //console.log(folderPath);

  res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', {
      zlib: { level: 9 } // maximale Kompression
  });

  archive.on('error', (err) => {
      throw err;
  });

  archive.pipe(res);

  archive.directory(folderPath, false);

  archive.finalize();
});

// Funktion zum Abrufen der internen Netzwerk-IP-Adressen von allen Ethernet-Adaptern
function getEthernetInternalIPs() {
    const ifaces = os.networkInterfaces();
    const ethernetInternalIPs = [];

    Object.keys(ifaces).forEach(ifname => {
        if (ifname.toLowerCase().includes('ethernet')) {
            ifaces[ifname].forEach(iface => {
                if (iface.family === 'IPv4' && !iface.internal) {
                    ethernetInternalIPs.push(iface.address);
                }
            });
        }
    });

    return ethernetInternalIPs;
}

app.listen(port[0], () => {
  var ip = getEthernetInternalIPs()[0];
  console.log(`Server läuft auf IP:Port: ${ip}:${port[0]}`);
});
//app.listen(port[1], () => {
  //console.log(`Server läuft auf Port ${port[1]}`);
//});

// Middleware zur Überprüfung des Headers
function get_header(req, res, next) {
  const expectedHeaderKey = 'key';
  const expectedHeaderValue = 'server_connection01'; // Erwarteter Wert für den Header 'Key'

  if (req.headers[expectedHeaderKey] === expectedHeaderValue) {
    // Der Header 'Key' enthält den erwarteten Wert
    next(); // Fahren Sie mit der nächsten Middleware oder Route fort
  } else {
    res.status(401).json({ error: 'Ungültiger Header.' }); // Ungültiger Header, senden Sie eine Fehlerantwort
  }
};



// Funktion zum Lesen und Analysieren der JSON-Datei
function readAndParseJSONFile(filePath) {
  try {
    // Lesen Sie den Inhalt der JSON-Datei synchron (asynchron wäre auch möglich)
    const jsonData = fs.readFileSync(filePath, 'utf8');

    // Analysieren Sie die JSON-Daten in ein JavaScript-Objekt
    const parsedData = JSON.parse(jsonData);

    return parsedData;
  } catch (error) {
    console.error('Fehler beim Lesen/Analysieren der JSON-Datei:',filePath, error);
    return null;
  }
}





// Funktion zum Lesen und Aktualisieren der JSON-Datei
function updateJSONFile(filePath, newItem) {
  try {
    // Lesen Sie den Inhalt der JSON-Datei synchron (asynchron wäre auch möglich)
    const jsonData = fs.readFileSync(filePath, 'utf8');

    // Analysieren Sie die JSON-Daten in ein JavaScript-Array
    const jsonArray = JSON.parse(jsonData);

    // Fügen Sie das neue Element hinzu
    jsonArray.push(newItem);

    // Schreiben Sie die aktualisierten Daten zurück in die Datei
    fs.writeFileSync(filePath, JSON.stringify(jsonArray, null, 2));

  } catch (error) {
    console.error('Fehler beim Lesen/Aktualisieren der JSON-Datei:', error);
  }
}

function neuer_ordner(username) {
  // Pfad zum übergeordneten Ordner, in dem du den neuen Ordner erstellen möchtest
  const parentFolderPath = 'uploads';
  
  // Name des neuen Ordners
  const newFolderName = username;
  
  // Den vollständigen Pfad zum neuen Ordner erstellen
  const newFolderPath = `${parentFolderPath}/${newFolderName}`;
  
  // Die mkdir-Funktion aufrufen, um den neuen Ordner zu erstellen
  fs.mkdir(newFolderPath, (err) => {
    if (err) {
      console.error('Fehler beim Erstellen des Ordners:', err);
    } else {
      console.log('Ordner erfolgreich erstellt:', newFolderPath);
    }
  });
}

// Funktion zum Löschen einer Datei
function deleteFile(filePath) {
  try{
    fs.unlinkSync(filePath);
  } catch(error){
    console.error(error);
  }
}

function getRandomArbitrary(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}


function ändere_einzelnes_json(datei, bild_pfad, userkey){
  fs.readFile(datei, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen der JSON-Datei: ', err);
      return;
    }
  
    try {
      // Parsen der JSON-Daten
      const jsonData = JSON.parse(data);
  
      // Füge das "profilebild"-Feld zum ersten Objekt hinzu (Index 0)
      jsonData.forEach((data)=>{
        if (data.user_key == userkey) {
         data.profilebild = bild_pfad;
  
      // Füge weitere "profilebild"-Felder zu anderen Objekten hinzu, falls erforderlich
  
      // Konvertiere die aktualisierten Daten zurück in JSON
      const updatedJson = JSON.stringify(jsonData, null, 2);
  
      // Schreibe die aktualisierten Daten zurück in die Datei
      fs.writeFile(datei, updatedJson, (err) => {
        if (err) {
          console.error('Fehler beim Schreiben der JSON-Datei: ', err);
        } else {
          console.log('Die JSON-Datei wurde erfolgreich aktualisiert.');
        }
      }); 
        }
      })
    } catch (error) {
      console.error('Fehler beim Parsen der JSON-Daten: ', error);
    }
  });
}
function lösche_alte_nachrichten(){
  try{
    fs.readdir('./chats', (err, files) => {

      // Erstellen Sie Links für jede Datei im "uploads"-Verzeichnis
      const fileLinks = files.map((file) => {
        return `./chats/${file}/messages.json`;
      });
      fileLinks.forEach((path)=>{
        var jsondata = readAndParseJSONFile(path);
        console.log('Max Nachrichten überprüfung:\nStatus:', jsondata.length, max_nachrichten, jsondata.length > max_nachrichten);
        if (jsondata.length > max_nachrichten) {
          while (jsondata.length > max_nachrichten) {
            if (jsondata[0].image !== "") {
              deleteFile(jsondata[0].image);
            }
            jsondata.shift();
            fs.writeFileSync(path, JSON.stringify(jsondata, null, 2), 'utf8');
          }
        }
      })
    });
  } catch(error){
    console.error(error);
  }

}
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Serverfehler!');
});
function start() {
  lösche_alte_nachrichten();
  setInterval(() => {
    lösche_alte_nachrichten();      
  }, 10 * 60 * 1000); 
}
start();
