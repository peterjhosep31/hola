const contenedorQR = document.getElementById('contenedorQR');
const formulario = document.getElementById('formulario');



const QR = new QRCode(contenedorQR);
QR.makeCode('holaa');


function cancelar() {
      const codigo = document.getElementById('codigo');
      const codigoAtrapado = codigo.textContent;

      return codigoAtrapado;

}

function codigoTiquete() {
      let codigo = cancelar();

      let envio = new FormData();
      envio.append('codigo', 'h');
      (`http://localhost:3105/canselar?codigo=${codigo}`, {
            method: 'get'
      }).then(response => {
            console.log(response);
      }).then(data => {
            //handle data
            console.log(data);
      })
            .catch(error => {
                  //handle error
                  console.log(error)
            });
}
