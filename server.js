// Definieren aller wichtigen variablen und Abhägnigkeiten
import fs from 'fs';
import express from 'express';
import archiver from 'archiver';
import multer from 'multer';
import mime from 'mime';
import path from 'path';
import cors from 'cors';
import { error } from 'console';
import os from 'os';
import sharp from "sharp";
import convert from "heic-convert";
import thumbsupply from "thumbsupply";
const app = express();
const port = ['3000', '80'];
sharp.simd(true);
app.use(cors());
// Festlegen von öffentlichen Dateien
app.use('/get_file/*', express.static('G:/Lennart/'));
app.use('/js/', express.static('js'));
app.use('/css/', express.static('css'));
app.use('/img/', express.static('img'));
app.use('/*', express.static('*'));

// Festlegen des Default Paths und anderen Listen
var default_path = "G:/Lennart";
var img_cache_json_path = './json/img_cache.json';
var video_formats = ['mp4', 'MOV', 'Mov', 'AVI', 'avi'];
var img_cache = [{}];
//lade_img_cache()

// Abfrage der IP
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
// starten des Servers
app.listen(port[0], () => {
  var ip = getEthernetInternalIPs()[0];
  console.log(`Server läuft auf IP:Port: ${ip}:${port[0]}`);
});

// Anfrage der Webseite
app.get('/', (req, res) => {
    var htmlseite = fs.readFileSync('index.html', 'utf8')
    res.send(htmlseite);
});

// Anfrage für den Standart Pfad Variable: default_path
app.get('/default_path', (req, res) =>{
    try{
        res.status(200).json({ message: default_path});
    } catch (error){
        console.error(error);
        res.status(500).json({ message: "Serverfehler"});
    }
})

// Anfrage für einen Dateipfad. 
// Header "path" = Dateipfad
// Serverantwort: Statusnachricht = "message", Unterordner = "unterordner", Dateien = "dateien"
app.get('/file_path', (req, res)=>{
    var pfad_anfrage = req.headers['path'];
    var unterordner = getDirectories(pfad_anfrage);
    var dateien = getFiles(pfad_anfrage);
    res.status(200).json({message: "Anfrage erfolgreich!",path: pfad_anfrage, unterordner, dateien});
})

// Anfrage für eine Dateivorschau. Nur für Bilder
// path = "Pfad/zur/Datei/bild.endung"
// bild wird als blob gesendet
app.get('/vorschau', async (req, res)=>{
    var dateipfad = req.headers['path'];
    let scaledImageBuffer;
    var re = /(?:\.([^.]+))?$/;
                
    var ext = re.exec(dateipfad)[1];
    try {
        if (ext == 'heic') {
            fs.readFile(dateipfad, async (err, data)=>{
                scaledImageBuffer =await datei_umwandeln_heic(data, 'vorschau');
                scaledImageBuffer = await sharp(scaledImageBuffer)
                    .resize({ height: 240 })
                    .toBuffer(); 
                //speichere_vorschau(dateipfad, scaledImageBuffer, 'jpeg');
                res.setHeader('Content-Type', `image/jpeg`);
                res.send(await scaledImageBuffer);  
            })
        } else if (video_formats.includes(ext)) {
            thumbsupply.lookupThumbnail('some-video.mp4')
                .then(thumb => {
                    fs.readFile(thumb, (err, data)=>{
                        res.setHeader('Content-Type', `image/png`);
                        res.send(data);
                    })   
                })
                .catch(err => {
                    thumbsupply.generateThumbnail(dateipfad, {
                        size: thumbsupply.ThumbSize.MEDIUM, // or ThumbSize.LARGE
                        timestamp: "10%", // or `30` for 30 seconds
                        forceCreate: true,
                        cacheDir: "./img/cache"
                    }).then(thumb =>{
                        fs.readFile(thumb, (err, data)=>{
                            res.setHeader('Content-Type', `image/png`);
                            res.send(data);
                        })   
                    }).catch(err=>{
                        console.error(err);
                    })
                });
        } else {
            scaledImageBuffer = await sharp(dateipfad)
            .resize({ height: 240 })
            .toFormat('jpeg')
            .toBuffer();   
            // speichere_vorschau(dateipfad, scaledImageBuffer, 'jpeg');
            res.setHeader('Content-Type', `image/jpeg`);
            res.send(scaledImageBuffer);
        }
    } catch (error) {
        res.status(500).json({message: "Fehler beim laden"});
        console.error(error);
        
    }
})

app.get('/lade_datei', (req, res)=>{
    var dateipfad = req.headers['path'];
    var datei_name = req.headers['datei_name'];
    var re = /(?:\.([^.]+))?$/;
                
    var ext = re.exec(dateipfad)[1];
    if (ext == "heic") {
        fs.readFile(dateipfad, async (err, data)=>{
            var datei = await datei_umwandeln_heic(data, "png");
            ext = "png";
            var mime_type = mime.getType(ext);
            res.setHeader('Content-Type', mime_type);
            res.setHeader('Content-Disposition', `inline; filename="${datei_name}"`);
            res.send(await datei);
        })
    } else {
        var mime_type = mime.getType(ext);
        res.setHeader('Content-Type', mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${datei_name}"`);
        res.sendFile(dateipfad, (err) => {
            if (err) {
                res.status(500).send('Fehler beim Öffnen der Datei');
            }
        });   
    }
})

// Abfrage von Unterordnern eines Ordners
// path = Dateipfad
function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
      return fs.statSync(path+'/'+file).isDirectory();
    });
}

// Abfrage von Dateien eines Ordners
// path = Dateipfad
function getFiles(path) {
    return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path+'/'+file).isFile();
      });
}

// inputBuffer = geladenes Bild in heic Format
// imgtypte: "vorschau" = output als jpeg in qualität 0.3, "png" = output als png in voller qualität

async function datei_umwandeln_heic(inputBuffer, imgtype) {
    if (imgtype == "vorschau") {
        return await convert({
            buffer: inputBuffer, // the HEIC file buffer
            format: 'JPEG',      // output format
            quality: 0.3
          });
    } else if(imgtype == "png"){
        return await convert({
            buffer: inputBuffer, // the HEIC file buffer
            format: 'PNG',      // output format
          });
    }
}

async function speichere_vorschau(dateipfad, data, endung) {
    var datum = new Date;
    var dateizeitstempel = datum.getTime();
    var dateiname = `./img/cache/cache_img_${dateizeitstempel}.${endung}`;
    fs.writeFile(dateiname, data, 'utf8',(err)=>{
        if (err) {
            console.error(err);
            return;
        }
        lade_img_cache();
        img_cache[dateipfad] = dateiname;
        console.log(JSON.stringify(img_cache));
        
        fs.writeFile(img_cache_json_path, img_cache, (err) => {
            if (err) {
                console.error(err);
                return
            }
            console.log('JSON-Datei erfolgreich geschrieben:', img_cache);
            
            lade_img_cache();
        });
    })
}
//console.log(getDirectories('G:/Lennart'), getFiles('G:/Lennart'));

function lade_img_cache() {
    try {
        fs.readFile(img_cache_json_path,'utf8',(err, data)=>{
            var data_json = JSON.parse(data);
            img_cache = data_json
            console.log(img_cache);
        })   
    } catch (error) {
        console.error(error);
    }
}