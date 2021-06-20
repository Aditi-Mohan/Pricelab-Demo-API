const functions = require("firebase-functions");
const express = require("express");

const admin = require("firebase-admin");
admin.initializeApp()
const _firestore = admin.firestore();
const app = express();

app.get("/", async (req, res) => {
    const snapshot = await _firestore.collection("banks").get();

    let banks = [];
    snapshot.forEach(doc => {
        let name = doc.id;
        let data = doc.data();

        banks.push({"bank": name, "variants": [...data["variants"]]});
    });

    res.status(200).send(JSON.stringify(banks));
});

app.get("/:bank/offers", async (req, res) => {
    const snapshot = await _firestore.collection("banks").doc(req.params.bank).collection("offers").get();

    let offers = [];
    snapshot.forEach(doc => {
        let data = doc.data();

        offers.push({"title": data["title"], "variant": data["variant"], "promoCode": data["promoCode"]});
    });

    res.status(200).send(JSON.stringify(offers));
});

app.post("/addBank", async (req, res) => {
    
    let vars = [];
    if(req.body["variants"] !== undefined) {
        vars = req.body["variants"];
    }

    if(req.body["offers"] !== undefined) {
        req.body["offers"].forEach(async (el) => {
            if(vars.indexOf(el["variant"]) === -1) {
                vars.push(el["variant"]);
            }

            await _firestore.collection("banks").doc(req.body["bank"]).collection("offers").doc().set(
                {
                    "title": el["title"],
                    "variant": el["variant"],
                    "promoCode": el["promoCode"]
                }
            );
        });
    }

    await _firestore.collection("banks").doc(req.body["bank"]).set({
        "variants": vars
    });

    res.status(201).send();
});

app.put("/:bank/addVariants", async (req, res) => {
    const doc = await _firestore.collection("banks").doc(req.params.bank).get();
    let newVariants = doc.exists ? doc.data()["variants"] : [];

    req.body["newVariants"].forEach((e) => {
        if(newVariants.indexOf(e) === -1) {
            newVariants.push(e);
        }
    });
    
    await _firestore.collection("banks").doc(req.params.bank).set({
        "variants": newVariants
    });

    res.status(204).send();
});

app.put("/:bank/addOffers", async (req, res) => {
    const doc = await _firestore.collection("banks").doc(req.params.bank).get();
    let oldVariants = doc.exists ? doc.data()["variants"] : [];
    let newVariants = [];

    req.body["newOffers"].forEach(async (el) => {
        
        if(oldVariants.indexOf(el["variant"]) === -1 && newVariants.indexOf(el["variant"]) === -1) {
            newVariants.push(el["variant"]);
        }

        await _firestore.collection("banks").doc(req.params.bank).collection("offers").doc().set(
            {
                "title": el["title"],
                "variant": el["variant"],
                "promoCode": el["promoCode"]
            }
        );
    });

    if(newVariants.length !== 0) {
        await _firestore.collection("banks").doc(req.params.bank).set({
            "variants": [...oldVariants, ...newVariants]
        });
    }

    res.status(204).send();
});

app.delete("/:bank", async (req, res) => {
    let success = await _firestore.collection("banks").doc(req.params.bank).delete().then((val) => true).catch(err => {console.log(err); return false;});

    if(success) {
        res.status(200).send();
    }
});

app.delete("/:bank/:variant", async (req, res) => {
    var offersRef = _firestore.collection('banks').doc(req.params.bank).collection("offers").where("variant", "==", req.params.variant);
    let batch = _firestore.batch();
    
    let success = offersRef.get().then(snapshot => {
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        batch.commit();
        return true;
      }).catch(err => {console.log(err); return false;});
    
        if(success) {
            const doc = await _firestore.collection("banks").doc(req.params.bank).get();
            let vars = doc.data()["variants"];
            let ind = vars.indexOf(req.params.variant);

            if(ind > -1) {
                vars.splice(ind, 1);
                await _firestore.collection("banks").doc(req.params.bank).set({
                    "variants": vars
                });
            }

            res.status(200).send();
        }
});

app.delete("/:bank/offer/:promoCode", async (req, res) => {
    var offerRef = _firestore.collection("banks").doc(req.params.bank).collection("offers").where("promoCode", "==", req.params.promoCode);
    let batch = _firestore.batch();

    let success = offerRef.get().then(snapshot => {
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        batch.commit();
        return true;
    }).catch(err => {console.log(err); return false;});

    if(success) {
        res.status(200).send();
    }
});



exports.banks = functions.https.onRequest(app);
