// ----- Elementos del HTML -----
const listaStories = document.getElementById("lista-stories");
const inputSubir = document.getElementById("subir");
const visor = document.getElementById("visor");
const barras = document.getElementById("barras");
const imagenStory = document.getElementById("imagen-story");
const botonCerrar = document.getElementById("cerrar");

// ----- Variables -----
const UNA_DIA = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
let stories = [];        // lista de stories: { imagen: "base64...", fecha: 123456 }
let indiceActual = 0;    // cuál story se está viendo
let temporizador;        // guarda el setInterval de la barra de progreso

// ----- Guardar y leer de localStorage -----
function guardarStories() {
  try {
    localStorage.setItem("stories", JSON.stringify(stories));
    return true;
  } catch (error) {
    // Si localStorage se llena, entra aquí
    alert("No hay más espacio para guardar stories. Espera a que expiren algunas.");
    return false;
  }
}

function cargarStories() {
  const guardado = localStorage.getItem("stories");
  if (guardado) {
    stories = JSON.parse(guardado);
  } else {
    stories = [];
  }
  borrarVencidas();
}

// Quita las stories que ya pasaron 24 horas
function borrarVencidas() {
  const ahora = Date.now();
  // filter se queda solo con las stories que tienen menos de 24 horas
  stories = stories.filter(function (story) {
    return ahora - story.fecha < UNA_DIA;
  });
  guardarStories();
}

// ----- Mostrar los círculos en la lista -----
function mostrarLista() {
  // Borramos los círculos anteriores (pero no el botón + ni el input)
  const viejos = document.querySelectorAll(".story");
  viejos.forEach(function (viejo) {
    viejo.remove();
  });

  // Creamos un círculo por cada story
  stories.forEach(function (story, i) {
    const circulo = document.createElement("div");
    circulo.className = "story";
    circulo.style.backgroundImage = "url(" + story.imagen + ")";
    circulo.addEventListener("click", function () {
      abrirVisor(i);
    });
    listaStories.appendChild(circulo);
  });
}

// ----- Subir imagen -----
inputSubir.addEventListener("change", function () {
  const archivo = inputSubir.files[0];
  if (!archivo) return;

  // FileReader lee el archivo del usuario
  const lector = new FileReader();
  lector.onload = function (evento) {
    // Creamos una imagen para saber su tamaño real
    const img = new Image();
    img.onload = function () {
      // Calculamos cuánto hay que reducirla para que no pase de 1080x1920
      // Math.min elige el factor más pequeño; el 1 evita agrandar imágenes chicas
      const factor = Math.min(1080 / img.width, 1920 / img.height, 1);
      const ancho = Math.round(img.width * factor);
      const alto = Math.round(img.height * factor);

      // Dibujamos la imagen reducida en un canvas (un "lienzo" invisible)
      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      canvas.getContext("2d").drawImage(img, 0, 0, ancho, alto);

      // Convertimos el canvas a base64 (JPEG con calidad 0.7 para que pese menos)
      const base64 = canvas.toDataURL("image/jpeg", 0.7);

      // Guardamos la story con la fecha actual
      stories.push({ imagen: base64, fecha: Date.now() });
      if (!guardarStories()) {
        stories.pop(); // si no cupo, la quitamos de la lista
      }
      mostrarLista();
    };
    img.src = evento.target.result;
  };
  lector.readAsDataURL(archivo); // esto convierte el archivo a base64

  inputSubir.value = ""; // permite subir la misma foto otra vez
});

// ----- Visor de stories -----
function abrirVisor(i) {
  indiceActual = i;
  visor.classList.add("activo");
  mostrarStory();
}

function cerrarVisor() {
  clearInterval(temporizador);
  visor.classList.remove("activo");
}

function mostrarStory() {
  clearInterval(temporizador); // paramos la barra anterior
  imagenStory.src = stories[indiceActual].imagen;

  // Creamos una barra de progreso por cada story
  barras.innerHTML = "";
  for (let i = 0; i < stories.length; i++) {
    const barra = document.createElement("div");
    barra.className = "barra";
    const relleno = document.createElement("div");
    relleno.className = "relleno";
    // Las stories anteriores ya se vieron: barra llena
    if (i < indiceActual) {
      relleno.style.width = "100%";
    }
    barra.appendChild(relleno);
    barras.appendChild(barra);
  }

  // La barra de la story actual se llena en 3 segundos
  const rellenoActual = barras.children[indiceActual].firstChild;
  let progreso = 0;
  temporizador = setInterval(function () {
    progreso = progreso + 1;               // sube 1% cada 30 ms
    rellenoActual.style.width = progreso + "%";
    if (progreso >= 100) {                 // 100 x 30 ms = 3 segundos
      siguienteStory();
    }
  }, 30);
}

function siguienteStory() {
  indiceActual++;
  if (indiceActual >= stories.length) {
    cerrarVisor(); // no hay más stories
  } else {
    mostrarStory();
  }
}

function anteriorStory() {
  if (indiceActual > 0) {
    indiceActual--;
  }
  mostrarStory();
}

botonCerrar.addEventListener("click", cerrarVisor);

// ----- Swipe (deslizar con el dedo) -----
let inicioX = 0;

visor.addEventListener("touchstart", function (evento) {
  inicioX = evento.touches[0].clientX; // dónde empezó el dedo
});

visor.addEventListener("touchend", function (evento) {
  const finX = evento.changedTouches[0].clientX; // dónde terminó
  const diferencia = finX - inicioX;
  if (diferencia < -50) {
    siguienteStory();   // deslizó a la izquierda
  } else if (diferencia > 50) {
    anteriorStory();    // deslizó a la derecha
  }
});

// ----- Inicio -----
cargarStories();
mostrarLista();

// Cada minuto revisa si alguna story ya cumplió 24 horas
setInterval(function () {
  if (!visor.classList.contains("activo")) { // no tocar la lista mientras se ve una story
    borrarVencidas();
    mostrarLista();
  }
}, 60000);