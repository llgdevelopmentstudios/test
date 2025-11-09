import cluster from 'cluster';
import os from 'os';

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
    console.log(`Primärer Prozess ${process.pid} ist aktiv`);

    // Worker für jeden CPU-Kern starten
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Ereignis: Ein Worker-Prozess stirbt
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} ist gestorben`);
        // Optional: Neuen Worker starten, um die Verfügbarkeit zu gewährleisten
        //cluster.fork();
    });
} else {
    // Hier wird der Code der separaten Datei ausgeführt
    import('./server.js');  // Importiert und führt `server.js` aus
}

