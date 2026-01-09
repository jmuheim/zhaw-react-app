// Quick & Dirty Highlighter für Pathmate-Exporte
// ==============================================
//
// Erlaubt das etwas komfortablere Durchlesen und Navigieren.
//
// Dieses Skript einfach in den <head> Bereich eines HTML-Dokuments importieren:
// <script src="export_highlighter.js"></script>
//
// Geschrieben von Josua Muheim (mit Hilfe von ChatGPT)
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(function() { // Etwas warten, damit jQuery UI etc. sich bereits initialisieren konnte
    $("th").each(function() {
    	// Micro Dialog Message: Hintergrund grünlich färben
    	if(this.innerText == "Micro Dialog Message") {
    		$(this).css("background-color", "rgb(0 128 0 / 40%)");
    	}

    	// Micro Dialog Command Message: Hintergrund bräunlich färben
    	if(this.innerText == "Micro Dialog Command Message") {
    		$(this).css("background-color", "rgb(128 0 0 / 40%)");
    	}

    	// Micro Dialog Decision Point: Hintergrund rötlich färben
    	if(this.innerText == "Micro Dialog Decision Point") {
    		$(this).css("background-color", "rgb(255 180 180)");
    	}

    	// Nachrichten-Text (wenn vorhanden): Hintergrund bläulich färben
    	if(this.innerText == "de-CH:") {
    		$(this).css("opacity", ".25");

    		td = findTdOfTh(this);
    		if(td.innerText == "[not set]") {
    			$(td).css("opacity", ".25");
    			$(this).closest("td").parent().find("th").css("opacity", ".25");
    		} else {
    			$(td).css("background-color", "rgb(0 0 255 / 24%)");
    		}
    	}

    	// Comment: Hintergrund gelb färben
    	if(this.innerText == "Comment:") {
    		td = findTdOfTh(this);
    		if(td.innerText != "[not set]") {
    			$(td).css("background-color", "yellow");
    		}
    	}

    	// Answer Types: orange färben + fett
    	if(this.innerText == "Answer type:") {
    		td = findTdOfTh(this);
    		$(td).css("color", "orange");
    		$(td).css("font-weight", "bold");
    	}

    	// Name: blau färben + fett (sowie Link-Anker setzen)
    	if(this.innerText == "Name:") {
    		td = findTdOfTh(this);

    		var a = document.createElement('a');
    		a.innerText = td.innerText;
    		a.name = `micro_dialog_${td.innerText}`;

    		td.innerText = "";
    		td.appendChild(a);

    		$(a).css("color", "blue");
    		$(a).css("font-weight", "bold");
    	}

    	// Micro Dialog to cascade / jump to when TRUE: blau färben + fett (sowie verlinken zu Link-Anker)
    	for(let cascadeOrJump of ["Micro Dialog to cascade to when TRUE:", "Micro Dialog to jump to when TRUE:"]) {
    		if(this.innerText == cascadeOrJump) {
    			td = findTdOfTh(this);

    			var a = document.createElement('a');
    			a.innerText = td.innerText;
    			a.href = `#micro_dialog_${td.innerText}`;

    			td.innerText = "";
    			td.appendChild(a);

    			$(a).css("color", "blue");
    			$(a).css("font-weight", "bold");
    			$(a).css("text-decoration", "underline");
    		}
    	}

    	// Rule: rot färben + fett
    	if(this.innerText == "Rule:") {
    		td = findTdOfTh(this);
    		$(td).css("color", "green");
    	}

    	// Diverses: Opacity 0.25 wenn default
    	const object = {
    		'Channel to send message:': '👤 App/partner message to participant',
    		'Store value to variable:': '[not set]',
    		'Comment:': '[not set]',
    		'Variable to store value to:': '[not set]',
    		'Stop Micro Dialog when TRUE:': 'NO ✋',
    		'Leave Decision Point when TRUE:': 'NO ✋',
    	};
    	for (const [key, value] of Object.entries(object)) {
    		if(this.innerText == key) {
    			td = findTdOfTh(this);
    			if(td.innerText == value) {
    			$(this).css("opacity", ".25");
    				$(td).css("opacity", ".25");
    			}
    		}
    	}
    });

    const vars = {}; // { "$VarName": ["AchtsamEmoji_1", "AchtsamEmoji_2", ...] }

    // --- Hilfsfunktion: Variablen in Textknoten ersetzen ---
    function replaceVariablesInNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        const regex = /\$[A-Za-z_][A-Za-z0-9_]*/g;
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
          const varName = match[0];
          const varBase = varName.slice(1);
          const idx = vars[varName] ? vars[varName].length + 1 : 1;
          const anchorName = `${varBase}_${idx}`;

          if (!vars[varName]) vars[varName] = [];
          vars[varName].push(anchorName);

          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));

          const a = document.createElement("a");
          a.href = `#${varBase}_0`;    // zurück zur Liste
          a.id = anchorName;           // Ziel für Liste
          a.textContent = varName;
          frag.appendChild(a);

  				$(a).css("color", "red");
  				$(a).css("text-decoration", "underline");

          lastIndex = match.index + varName.length;
        }

        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.nodeName !== "A") {
          Array.from(node.childNodes).forEach(replaceVariablesInNode);
        }
      }
    }

    // --- Verarbeitung aller Tabellenzellen ---
    $("td").each(function() {
      replaceVariablesInNode(this);
    });

    // --- Ziel-Container unter "Micro Dialogs" finden ---
    const $microDialogContent = $("h2").filter(function() {
      return $(this).text().trim() === "Micro Dialogs";
    }).next(".ui-accordion-content");

    if ($microDialogContent.length) {
      const sorted = Object.keys(vars).sort();
      if (sorted.length) {
        const $list = $("<ul style='font-size: 0.75em'>");
        sorted.forEach(v => {
          const varBase = v.slice(1);
          const listAnchorName = `${varBase}_0`;

          const $li = $("<li>");
          const $anchor = $("<a>").attr("id", listAnchorName).text(v + " ");
          $li.append($anchor);

          const supLinks = vars[v]
            .map((anchorName, i) => `<a href="#${anchorName}" style='color: red; text-decoration: underline'>${i + 1}</a>`)
            .join(", ");

          const $sup = $("<sup>").html(supLinks);
          $li.append($sup);

          $list.append($li);
        });

        const $heading = $("<h3>").text("Verwendete Variablen");
        $microDialogContent.prepend($heading, $list);
      }
    } else {
      alert("Micro Dialogs nicht gefunden!");
    }

    function findTdOfTh(th) {
    	return $(th).parent().find("td")[0];
    }
  }, 1000); // 1 Sekunde
});