require("dotenv").config();
const express = require("express");
const request = require("request");
const bodyParser = require("body-parser");
const pug = require("pug");
const _ = require("lodash");
const path = require("path");
const { PayTadi } = require("./models/mongoose");
const { initializePayment, verifyPayment } = require("./config/paystack")(
  request
);

const port = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public/")));
app.set("view engine", pug);

app.get("/", (req, res) => {
  res.render("index.pug");
});

app.post("/paystack/pay", (req, res) => {
  const form = _.pick(req.body, ["amount", "email", "full_name"]);
  form.metadata = {
    full_name: form.full_name,
  };
  form.amount *= 100;

  initializePayment(form, (error, body) => {
    if (error) {
      //handle errors
      console.log(error);
      return res.redirect("/error");
      return;
    }
    response = JSON.parse(body);
    res.redirect(response.data.authorization_url);
  });
});

app.get("/paystack/callback", (req, res) => {
  const ref = req.query.reference;
  verifyPayment(ref, (error, body) => {
    if (error) {
      //handle errors appropriately
      console.log(error);
      return res.redirect("/error");
    }
    response = JSON.parse(body);

    const data = _.at(response.data, [
      "reference",
      "amount",
      "customer.email",
      "metadata.full_name",
    ]);

    [reference, amount, email, full_name] = data;

    newPayTadi = { reference, amount, email, full_name };

    const paytadi = new PayTadi(newPayTadi);

    paytadi
      .save()
      .then((paytadi) => {
        if (!paytadi) {
          return res.redirect("/error");
        }
        res.redirect("/receipt/" + paytadi._id);
      })
      .catch((e) => {
        res.redirect("/error");
      });
  });
});

app.get("/receipt/:id", (req, res) => {
  const id = req.params.id;
  PayTadi.findById(id)
    .then((PayTadi) => {
      if (!PayTadi) {
        //handle error when the paytadi is not found
        res.redirect("/error");
      }
      res.render("success.pug", { PayTadi });
    })
    .catch((e) => {
      res.redirect("/error");
    });
});

app.get("/error", (req, res) => {
  res.render("error.pug");
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
