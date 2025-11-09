// Divs einfügen
document.body.innerHTML = document.body.innerHTML + '<div id="benachrichtigungen_div"><p id="benachrichtigungen_inhalt"></p></div>';
// Style einbauen
var styles = `
    #benachrichtigungen_div{
            right: 0px;
            bottom: 0px;
            background-color: rgba(128, 128, 128, 0.562);
            width: auto;
            height: auto;
            position: fixed;
            z-index: 129;
            display: none;
            max-width: 40%;
        }
        #benachrichtigungen_inhalt{
            font-size: 25px;
        }
`

var styleSheet = document.createElement("style");
styleSheet.textContent = styles
document.head.appendChild(styleSheet);
// Variablen erstellen
var benachrichtigungen_div = document.getElementById("benachrichtigungen_div");
var benachrichtigungen_inhalt = document.getElementById("benachrichtigungen_inhalt");

// Benachrichtigungsfunktion
function benachrichtigung(text, color, dauer) {
    benachrichtigungen_div.style.display = "block";
    // Einblendung
    benachrichtigungen_div.style.animationName = "einblenden";
    benachrichtigungen_div.style.animationDuration = "1s";
    benachrichtigungen_div.style.animationTimingFunction = "linear";
    // Daten einstellen
    benachrichtigungen_div.style.backgroundColor = color;
    benachrichtigungen_inhalt.innerText = text;
    setTimeout(() => {
        //Ausblenden
        benachrichtigungen_div.style.animationName = "ausblenden";
        benachrichtigungen_div.style.animationDuration = "1s";
        benachrichtigungen_div.style.animationTimingFunction = "linear";
        setTimeout(() => {
            benachrichtigungen_div.style.display = "none";
        }, 1000);
    }, dauer);
}

function mitteilung(color, data, dauer, y, x) {
    benachrichtigung(data, color, dauer);
}