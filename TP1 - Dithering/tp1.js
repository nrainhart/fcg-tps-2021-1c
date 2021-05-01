// Cargamos una imagen 
function handleFiles(e)
{
    // abrir el archivo
    console.log("> Cargando imagen...");
    var URL      = window.webkitURL || window.URL;
    // canvas de entrada, de dithering y de diferencias
    var canvasinput  = document.getElementById('canvasinput');
    var contextinput  = canvasinput.getContext('2d');
    var url      = URL.createObjectURL(e.target.files[0]);
    var img      = new Image();

    // limpiamos el canvas
    contextinput.clearRect(0, 0, canvasinput.width, canvasinput.height);

    // dibujamos en el canvas (ojo que es asincrónica!)
    img.onload = function()
    {
        // mostramos la imagen cargada
        canvasinput.width  = img.naturalWidth;
        canvasinput.height = img.naturalHeight;
        contextinput.drawImage(img, 0, 0);
        console.log("> ... imagen cargada!");

        var canvasresultFloyd  = document.getElementById('canvasresultFloyd');
        var canvasdiffFloyd    = document.getElementById('canvasdiffFloyd');
        var canvasresultJarvis  = document.getElementById('canvasresultJarvis');
        var canvasdiffJarvis    = document.getElementById('canvasdiffJarvis');

        // computamos dither y diferencia
        recomputeImages(canvasinput, canvasresultFloyd, canvasdiffFloyd, false);
        recomputeImages(canvasinput, canvasresultJarvis, canvasdiffJarvis, true);
    }

    img.src = url;
}

// Computa las imágenes dereivadas (dither y substraction)
function recomputeImages(canvasinput, canvasresult, canvasdiff, useJarvis)
{
    console.log("> Computando dithering y diferencias...");
    // obtenemos los canvas
    var contextinput  = canvasinput.getContext('2d');
    var contextresult = canvasresult.getContext('2d');
    var contextdiff   = canvasdiff.getContext('2d');

    // obtener niveles
    var levels = document.getElementById('inputlevels').value;

    // limpiamos el canvas
    contextresult.clearRect(0, 0, canvasresult.width, canvasresult.height);
    contextdiff.clearRect(0, 0, canvasdiff.width, canvasdiff.height);

    var inputImageData = contextinput.getImageData(0, 0, canvasinput.width, canvasinput.height);

    // filtramos la imagen
    // creamos la imagen nueva (slice copia los datos)
    var ditherimg = new ImageData(new Uint8ClampedArray(inputImageData.data), canvasinput.width, canvasinput.height);

    // filtrado
    dither(ditherimg,levels, useJarvis)

    // mostramos el resultado despuás del filtrado
    canvasresult.width  = canvasinput.width;
    canvasresult.height = canvasinput.height;
    contextresult.putImageData( ditherimg, 0, 0 );
    canvasresult.toDataURL('image/png');

    // diferencias
    // creamos la imagen nueva (slice copia los datos)
    var subsimg = new ImageData(new Uint8ClampedArray(inputImageData.data), canvasinput.width, canvasinput.height);

    // filtrado
    substraction(inputImageData,ditherimg,subsimg);

    // mostramos el resultado despuás del filtrado
    canvasdiff.width  = canvasinput.width;
    canvasdiff.height = canvasinput.height;
    contextdiff.putImageData( subsimg, 0, 0 );
    canvasdiff.toDataURL('image/png');

    console.log("> ... finalizado!");
}

// Inicialización del documento
window.onload = function()
{
    // asocio inputfile a la función addImage
    var inputfile   = document.getElementById('inputfile');
    inputfile.addEventListener('change', handleFiles);

    // asocio inputlevels a la función recomputeImages()
    var inputlevels   = document.getElementById('inputlevels');

    var canvasresultFloyd  = document.getElementById('canvasresultFloyd');
    var canvasdiffFloyd    = document.getElementById('canvasdiffFloyd');
    var canvasresultJarvis  = document.getElementById('canvasresultJarvis');
    var canvasdiffJarvis    = document.getElementById('canvasdiffJarvis');

    inputlevels.addEventListener('change', () => {
        recomputeImages(canvasinput, canvasresultFloyd, canvasdiffFloyd, false);
        recomputeImages(canvasinput, canvasresultJarvis, canvasdiffJarvis, true);
    });

    console.log("> HTML listo!");
};
