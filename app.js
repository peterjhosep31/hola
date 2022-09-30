const express = require("express");
const sessions = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
const stripe = require("stripe");
const db = new sqlite3.Database("./db/traintiquets.db");
const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(express.static(__dirname + "/public"));
server.set("view engine", "ejs");
server.use(cookieParser());

const port = 3105;
const timeExp = 1000 * 60 * 60;

server.use(
  sessions({
    secret: "rfghf66a76ythggi87au7td",
    saveUninitialized: true,
    cookie: { maxAge: timeExp },
    resave: false,
  })
);

server.get("/", (req, res) => {
  res.render("principal");
});

server.get("/inicio", (req, res) => {
  res.render("iniciar");
});

server.post("/login", (req, res) => {
  let correo = req.body.correo;
  let contraseña = req.body.contraseña;
  db.get(
    "SELECT contraseña FROM registro WHERE correo=$correo",
    {
      $correo: correo,
    },
    (error, rows) => {
      if (rows) {
        if (bcrypt.compareSync(contraseña, rows.contraseña)) {
          session = req.session;
          session.correo = correo;
          return res.render("iniciada");
        }
        return res.send("La contraseña es incorrecta", error);
      }
      return res.send("El usuario no existe", error);
    }
  );
});

server.get('/iniciada', (req, res) => {
  res.render('iniciada')
})

server.get("/registro", (req, res) => {
  res.render("registro");
});

server.post(
  "/registro",
  [
    body(
      "nombres",
      "El tipo de datos es incorrecto, pudo haber ingresado algun caracter especial, algun numero o poder esatdo vacio."
    )
      .exists()
      .isLength({ min: 3 }),
    body(
      "apellidos",
      "El tipo de datos es incorrecto, pudo haber ingresado algun caracter especial, algun numero o poder esatdo vacio."
    )
      .exists()
      .isLength({ min: 3 }),
    body("correo", "El correo ingresado es invalido, por favor retifiquelo")
      .exists()
      .isEmail()
      .normalizeEmail(),
    body(
      "contraseña",
      "La contraseña debe tener como minimo 6 caracteres y un caracter especial"
    )
      .exists()
      .isLength({ min: 6 }),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const valores = req.body;
      const validaciones = errors.array();
      return res.render("registro", {
        valores: valores,
        validaciones: validaciones,
        fechaActual: fechaActual,
      });
    } else {
      let nombres = req.body.nombres;
      let apellidos = req.body.apellidos;
      let correo = req.body.correo;
      let contraseña = req.body.contraseña;
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hash = bcrypt.hashSync(contraseña, salt);
      db.get(
        `INSERT INTO registro(nombres, apellidos, correo, contraseña) VALUES(?,?,?,?)`,
        [nombres, apellidos, correo, hash],
        function (error) {
          if (!error) {
            console.log("insert ok");
            const transporter = nodemailer.createTransport({
              host: "smtp.gmail.com",
              port: 587,
              auth: {
                user: "11traintickets11@gmail.com",
                pass: "whvzzawcqsprwwgu",
              },
            });
            transporter
              .sendMail({
                from: "11traintickets11@gmail.com",
                to: correo,
                subject: "Registro exitoso",
                html: "<h1>SU REGISTRO FUE EXITOSO</h1><p>Apreciado Usuario(a), el presente correo es para informar que ha sido registrado(a) correctamente en nuestro aplicativo web <b>Train Tiquets</b> Esperamos que nuestra aplicación sea de su agrado y disfrute de todas las herramientas brindadas en esta web</p>",
              })
              .then((res) => {
                console.log(res);
              })
              .catch((err) => {
                console.log(err);
              });
            return res.render("principal");
          } else {
            if (error) {
              let errorPrimaria = [
                "El correo ya esta registrado, por favor intente con otro o recupere la contraseña de este",
              ];
              if (error.errno == 19) {
                res.render("registro", {
                  errorPrimaria: errorPrimaria,
                  error: error,
                });
              }
            }
            return console.log("inset error", error);
          }
        }
      );
    }
  }
);

server.get("/logOut", (req, res) => {
  session = req.session;
  if (session.correo) {
    req.session.destroy();
    return res.redirect("/");
  }
  return res.send("No tiene sesion para cerrar");
});

server.get("/recuperar", (req, res) => {
  res.render("validarCorreo");
});

server.post("/correoAutentificado", (req, res) => {
  let correo = req.body.correo;
  db.get(
    "SELECT nombres FROM registro WHERE correo=$correo",
    {
      $correo: correo,
    },
    (error, rows) => {
      let nombre = rows.nombres;
      if (!error) {
        res.render("recuperarContraseña");
        let contraseñaDefinitiva = random();
        //? envia el correo de la nueva contraseña
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          auth: {
            user: "11traintickets11@gmail.com",
            pass: "whvzzawcqsprwwgu",
          },
        });
        transporter
          .sendMail({
            from: "11traintickets11@gmail.com",
            to: correo,
            subject: "Recuperar contraseña",
            html:
              "hola " +
              nombre +
              " su nueva contraseña es:" +
              contraseñaDefinitiva,
          })
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log(err);
          });
        //?se hashea la contraseña nueva
        const saltRounds = 10;
        const salt = bcrypt.genSaltSync(saltRounds);
        const hash = bcrypt.hashSync(contraseñaDefinitiva, salt);
        //? se actializa la contraseña por la que ya se avia creado antes
        db.get(
          "UPDATE registro SET contraseña = $contraseña WHERE correo=$correo",
          {
            $contraseña: hash,
            $correo: correo,
          },
          (error) => {
            if (!error) {
              return console.log("update OK");
            }
          }
        );
      }
    }
  );
});

server.post("/cambiar", (req, res) => {
  let correo = req.body.correo;
  let codigo = req.body.codigoContraseña;
  let contraseñaNueva = req.body.contraseñaNueva;

  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(contraseñaNueva, salt);
  db.get(
    "SELECT contraseña FROM registro WHERE correo=$correo",
    {
      $correo: correo,
    },
    (error, rows) => {
      if (!error) {
        if (bcrypt.compareSync(codigo, rows.contraseña)) {
          db.get(
            "UPDATE registro SET contraseña=$contraseña WHERE correo=$correo",
            {
              $contraseña: hash,
              $correo: correo,
            },
            (error) => {
              if (!error) {
                console.log("UPDATE OK");
                let array = ["Se ha actualizado su contraseña exitosamente"];
                return res.render("principal", { error: error, array: array });
              }
            }
          );
        }
      }
    }
  );
});


server.get("/comprandoTiquete", (req, res) => {
  let destino = req.query.destino;
  let hora = req.query.hora;
  let fecha = req.query.fecha;
  let codigo = req.query.tiquete;
  session = req.session;

  let error;
  let errorNull;
  let errorDate;
  let errorHour;
  let pasarela = false;

  if (destino != "undefined" && hora != "undefined" && fecha != "") {
    console.log("si hay data");
    if (fecha >= fechaActual) {
      console.log("la fecha es valida");
      if (hora < hour) {
        pasarela = true;
        console.log("bakend:", hour, "- frond:", hora);
        pasarela;
      } else {
        error = 1;
        console.log("Este tren ya salio", error);
        errorHour = [
          "Lo sentimos el tren que sale a esta hora ya salio, si quieres escoje uno mas tarde a la hora actual: " +
          hour,
        ];
        return res.render("iniciada", { errorHour: errorHour });
      }
    } else {
      error = 1;
      console.log("la fecha es invalida", error);
      errorDate = [
        "Lo sentimos la fecha es anterior a la fecha actual, por favor corrijala he intente de nuevo",
      ];
      return res.render("registro", { error: error, errorDate: errorDate });
    }
  } else {
    error = 1;
    console.log("no hay data", error);
    errorNull = [
      "Lo sentimos le hace falta llenar mas datos, coorrobore por favor e intente de nuvo",
    ];
    return res.render("iniciar", { errorNull: errorNull });
  }

  if (pasarela === true) {
    db.get('INSERT INTO comprar (codigo, fecha, hora, destino, correo) VALUES (?, ?, ?, ?, ?)', [
      codigo, fecha, hora, destino, session.correo
    ], (error) => {
      if (error) {
        console.log("error", error);
      } else {
        db.all('SELECT * FROM comprar WHERE correo = $correo', {
          $correo: session.correo
        }, (error, rows) => {
          console.log("Hay un error", error);
          console.log("inset ok");
          res.render('codigo', { data: rows })
        })
      }
    })
  }
});

server.get("/comprar", (req, res) => {
  session = req.session;
  db.get("SELECT * FROM comprar WHERE correo= $correo", {
    $correo: session.correo
  }, (error, rows) => {
    if (!error) {
      console.log(rows);
      res.render("codigo", { data: rows });

    } else {
      console.log(error, "este es el que agovia");
    }
  })
});


server.get("/acontecimientos", (req, res) => {
  res.render("intergerente")
});

server.post("/acontecimientos", [

], (req, res) => {
  let correo = req.body.correo;
  let mensaje = req.body.mensaje;
  db.get(
    'INSERT INTO acontecimientos (correo, mensaje) VALUES (?,?)',
    [correo, mensaje],
    function (error) {
      if (!error) {
        console.log("Enviado correctamente");
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          auth: {
            user: "2022traintickets@gmail.com",
            pass: "vflatihlfczlhjqw",
          },
        });
        transporter
          .sendMail({
            from: "2022traintickets@gmail.com",
            to: correo,
            subject: "Acontecimientos sobre su viaje",
            html: mensaje,
          })
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log(err);
          });
        return res.render("principal");
      }
    }
  );
});

server.get("/recuperar", (req, res) => {
  res.render("validarCorreo");
});

server.get("/actualizarcli", (req, res) => {
  res.render("cuenta");
});

server.get("/infocliente", (req, res) => {
  sessions = req.session;
  if (sessions.correo) {
    db.get(
      `SELECT * FROM registro WHERE correo =$correo`,
      {
        $correo: sessions.correo,
      },
      (error, rows) => {
        if (error) {
          return res.status(500).redirect("/");
        }

        return res.render("informa", { user: rows });
      }
    );
  }
});

server.post('/actuminfo', (req, res) => {
  email = req.session.correo;
  let name = req.body.nombre;
  let apellido = req.body.apellido;

  console.log(email);
  db.run("UPDATE registro SET nombres=?,apellidos=? WHERE correo=?",
    [name, apellido, email], (error, row) => {
      if (!error) {
        return res.redirect("/infocliente")
      }
      if (error) {
        res.send("No se pudo actualizar")
        console.log(error);
      }
    }
  )

});



server.get("/botom", (req, res) => {
  res.render("botom");
});

server.get("/botom", (req, res) => {
  session = req.session;
  db.get("SELECT * FROM tiquete WHERE correo= $correo", {
    $correo: sesion.correo
  }, (error, row) => {
    if (row) {
      res.render('botom', { row: row });
    } else {
      res.render('botom')
    }

  });
})

server.post("/canselar", (req, res) => {
  let codigo = req.query.codigo;
  session = req.session;
  session.correo = correo;

  db.get("DELETE FROM tiquete WHERE codigo=(?)", codigo, function (err) {
    if (err) {
      console.log(err);
      console.log("NO borro");
    }
    else {
      console.log("se borro Exitosamente");
      let mensaje = "Se borro exitosamente su tiquete estamos en proseso de devolucion de su dinero, grcias por usar nuestro servicios";
      res.render('botom', { mensaje: mensaje })

    }
  })
});

server.listen(port, () => {
  console.log(`Su puerto es ${port}`);
});

/*
-------------------------------------------------------------------------------
*/

function random() {
  let rangoContraseña = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let contraseña = "";
  let controlador = 6;
  for (let i = 0; i < controlador; i++) {
    contraseña += rangoContraseña[Math.floor(Math.random() * 10)];
  }
  return contraseña;
}

const fecha = new Date();
const añoActual = fecha.getFullYear();

const mesActual = fecha.getMonth() + 1;
let mesActuall;
if (mesActual > 0 && mesActual < 10) {
  String(mesActual);
  mesActuall = "0" + mesActual;
} else {
  mesActuall = mesActual;
}

const diaActual = fecha.getDate();
let diaActuall;
if (diaActual > 0 && diaActual < 10) {
  String(diaActual);
  diaActuall = "0" + diaActual;
} else {
  diaActuall = diaActual;
}

var hour = fecha.toLocaleTimeString();

const fechaActual = añoActual + "-" + mesActuall + "-" + diaActuall;
