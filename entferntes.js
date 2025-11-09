const { Image } = require('image-js');
app.get('/low_res/*', (req, res)=>{
    const requestedPath = req.params[0];
    var filePath = path.join(__dirname, requestedPath);
     //Überprüfen Sie, ob die Datei existiert
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    let image = Image.load(filePath);
    let downscaled = image
      .resize({ width: 240 }) // resize the image, forcing a width of 240 pixels. The height is computed automatically to preserve the aspect ratio.
    res.type('png').send(downscaled);
  })

  app.get('/low_res/*', (req, res) => {
    const requestedPath = req.params[0];
    const filePath = path.join(__dirname, requestedPath);
  
    // Überprüfen, ob die Datei existiert
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
  
    loadImage(filePath).then(image => {
        const targetWidth = 240;
        const scaleFactor = targetWidth / image.width;
        const targetHeight = image.height * scaleFactor;
  
        const canvas = createCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  
        res.type('png');
        canvas.createPNGStream().pipe(res);
    }).catch(error => {
        console.error('Fehler beim Laden des Bildes:', error);
        return res.status(500).json({ error: 'Serverfehler' });
    });
  });

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