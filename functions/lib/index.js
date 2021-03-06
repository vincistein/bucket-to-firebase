"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const path = require('path');
admin.initializeApp();
exports.BucketToFirebase = functions.storage.bucket("bucket-to-firebase").object().onFinalize(async (object) => {
    const filePath = object.name;
    const fileObject = path.parse(filePath);
    if (fileObject.ext === '')
        return;
    const db = admin.firestore();
    const fileBucket = object.bucket;
    const contentType = object.contentType;
    const fileName = fileObject.name;
    const collection = fileObject.dir;
    const isDocumentOrCollection = (collection.split("/").length % 2) ? true : false;
    if (contentType !== 'application/json') {
        console.log("Solo archivos JSON");
        return;
    }
    if (collection === '') {
        console.log("BucketToFirestore:", "No se permite la creación en la raiz, incluye un directorio");
        return;
    }
    const bucket = admin.storage().bucket(fileBucket);
    const file = await bucket.file(filePath).download();
    const fileTransform = JSON.parse(file.toString());
    let registry;
    let databasePath;
    if (!isDocumentOrCollection) {
        const isNew = await (await db.doc(collection).get()).exists;
        const registry_value = {
            [fileName]: {
                lastUpdate: new Date,
                size: object.size,
                length: fileTransform.length
            }
        };
        databasePath = `${collection}/${fileName}`;
        console.log("BucketToFirestore:", "Guardando registro...");
        registry = !isNew ? db.doc(collection).set(registry_value) : db.doc(collection).update(registry_value);
    }
    else {
        databasePath = collection;
        registry = new Promise((resolve) => resolve());
    }
    return registry.then(async () => {
        console.log("BucketToFirestore:", "Creando colección...");
        try {
            await setCollectionDatabase(fileTransform, db.collection(databasePath)).then(() => { console.log("BucketToFirestore:", "Documentos creados."); });
        }
        catch (error) {
            console.log("BucketToFirestore:", error);
        }
    });
});
async function setCollectionDatabase(collection, ref) {
    await Promise.all(collection.map((document) => ref.doc(document.id ? document.id : '').set(document)));
}
//# sourceMappingURL=index.js.map