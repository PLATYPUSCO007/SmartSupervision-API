require('dotenv').config();
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { default: axios } = require('axios');
const prompt = require("prompt-sync")();

let dataJson = '';

// Leer data JSON
async function getJSON(pathDataJSON) {
    try {
        return await JSON.parse(fs.readFileSync(pathDataJSON, 'utf8'));
    } catch (error) {
        throw error;
    }
}


// Buscar si existe archivo PDF de la queja
async function searchFiles(idQueja) {
    try {
        let filesFinds = [];
        console.log(idQueja);
        const files = await fs.readdirSync(process.env.PATH_FILES);
        files.forEach((file)=>{
            if (file.includes(idQueja)) {
                filesFinds.push(file);
            }
        });
        return filesFinds;
    } catch (error) {
        throw error;
    }
}

// Obtener PDF encontrado
async function getFilesFinds(files = []){
    try {
        return files.map((file)=>{
            let filePath = path.join(process.env.PATH_FILES, file);
            return fs.createReadStream(filePath);
        });
    } catch (error) {
        throw error;
    }
}

//Genera un archivo con su contenido
async function writeFileResponses(responses, pathResponse){
    try{
        responses.forEach(async (response)=>{
            await fs.appendFileSync(`${pathResponse}`, `${JSON.stringify(response)}, \n`);
        })
    }catch(error){
        throw error;
    }
}

function getDate() {
    let dateToday = new Date();
    dateToday = dateToday.getTime() + (-dateToday.getTimezoneOffset() * 60 * 1000);
    dateToday = new Date(dateToday);
    dateToday = dateToday.toISOString().substring(0, 10).replace("T", " ");
    return dateToday;
}

async function login() {
    
    let data = {
        "username":`${process.env.USERNAME}`, 
        "password":`${process.env.PASSWORD}`
    };
    
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.URL_BASE}login/`,
        headers: { 
          'X-SFC-Signature': `${process.env.SIGNATURE_SESSION}`
        },
        data : data
      };
    
      try {
        const response =   await axios.request(config);    
        process.env.SECRET_KEY = JSON.stringify(response.data.access);
        process.env.REFRESH_KEY = JSON.stringify(response.data.refresh);
        // process.env.SECRET_KEY =  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQwMDg0NzkzLCJqdGkiOiJkY2IxMmQ4N2JhMTA0MWI2YTdmOTVlYzQ1NmMxMjlhYyIsInVzZXJfaWQiOjI3NX0.LOVBpeFDTvDEnTT6S0aX3U3xPbP-yYaYUX-b9EnRIc0";
        // process.env.REFRESH_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc0MDE2NzU5MywianRpIjoiNGM1MTEyYzFjYThlNDdhOGI0NjM1YWE4MGVkOGUzY2IiLCJ1c2VyX2lkIjoyNzV9.MXtm3aps0ynxHRbOtqPcsYzmhaZxMpJJzwgWcV6E0WI";

      } catch (error) {
        console.error(error);
         
      }
}

function refreshToken() {
    
    let data = {
        "refresh": `${process.env.REFRESH_KEY}`
    };

    return new Promise(async (resolve)=>{
        const sign = prompt(`Por favor ingrese la Firma para el refresh - , ${JSON.stringify(data)}`);
        console.log('Firma ingresada - ', '"' + `${sign.toString().replace(/(\r\n|\n|\r)/gm, "")}` + '"');
    
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.URL_BASE}token/refresh`,
            headers: { 
                'Authorization': `Bearer ${process.env.SECRET_KEY.toString().replaceAll('"', "")}`,
                'Content-Type': 'application/json',
                'X-SFC-Signature': `${sign.toString().replace(/(\r\n|\n|\r)/gm, "")}`
            },
            data : data
        };
    
        try {
            const response = await axios.request(config);    
            process.env.SECRET_KEY = JSON.stringify(response.data.access);
            process.env.REFRESH_KEY = JSON.stringify(response.data.refresh);
            console.log('Token nuevo generado con exito...!! - ', response.data);
            resolve(true);
        } catch (error) {
            console.error('No fue posible refrescar el token - ');
            console.error(error.response.data);
            resolve(true);
        }

    })

}

function sendFilesAXIOS(files, dataQueja) {
    let isValidToken = true;
    return new Promise(async (resolve, reject)=>{
        do {
            // Generar TOKEN
            if (isValidToken && (process.env.SECRET_KEY === "")) {
                await login();
            }
    
            if (process.env.SECRET_KEY === "") reject(false);
            console.log('TOKEN PARA ENVIO DE INFO DOC - ', process.env.SECRET_KEY.toString());
    
            let responses = [];
    
            files.forEach(async (file)=>{
                const form = new FormData();
                form.append('file', file);
                form.append('codigo_queja', dataQueja.id);
                form.append('type', 'pdf');
                
                axios.post(`${process.env.URL_BASE}storage/`, form, {
                    headers: {
                        'Authorization': `Bearer ${process.env.SECRET_KEY.toString().replaceAll('"', "")}`,
                        'Content-Type': 'multipart/form-data',
                        'X-SFC-Signature': `${dataQueja.signature}`,
                    }
                }).then((response)=>{
                    response.data.id_queja = dataQueja.id;
                    console.log(response.data);
                    responses.push(response.data);
                })
                .catch(async (error)=>{
                    if (error.response) {
                        if ((error.response.data.status_code === 401) && (error.response.data.message[0].message === 'El token es inválido o ha expirado')) {
                            console.log(`El Token expiro, id_fallo - ${dataQueja.id} `, error.response.data);
                            await refreshToken();
                            isValidToken = false;
                        }else{
                            error.response.data.id_queja = dataQueja.id;
                            console.log(error.response.data); 
                            responses.push(error.response.data);
                            isValidToken = true;
                        }
                    }else{
                        console.log(error);
                        console.log('El Error anterior no esta controlado, saliendo de la ejecucion ...');
                        process.exit();                    }
                })
                .finally(async ()=> {
                    if (isValidToken) {
                        const pathResponse = path.join(`${process.env.PATH_RESPONSE_FILES}`, `${getDate()}_DOCS.json`);
                        await writeFileResponses(responses, pathResponse);
                        resolve(true);
                    }
                })
            })
    
        } while (!isValidToken);
    })
}

function sendDataAXIOS(dataQueja) {
    let isValidToken = true;
    return new Promise(async (resolve, reject)=>{
        do {
            // Generar TOKEN
            if (isValidToken && (process.env.SECRET_KEY === "")) {
                await login();
            }
    
            if (process.env.SECRET_KEY === "") reject(false);
            console.log('TOKEN PARA ENVIO DE INFO DATA - ', process.env.SECRET_KEY.toString());
    
            let responses = [];
    
            let data = JSON.stringify(dataQueja.data);
    
            let config = {
                method: 'put',
                maxBodyLength: Infinity,
                url: `${process.env.URL_BASE}queja/${dataQueja.id}/`,
                headers: { 
                    'Authorization': `Bearer ${process.env.SECRET_KEY.toString().replaceAll('"', "")}`,
                    'Content-Type': 'application/json',
                    'X-SFC-Signature': `${dataQueja.signature}`
                },
                data : data
              };
    
            axios.request(config)
                .then((response)=>{
                    response.data.id_queja = dataQueja.id;
                    console.log('Queja actualizada con exito - ', response.data);
                    responses.push(response.data);
                })
                .catch(async (error)=>{
                    
                    if (error.response) {
                        if ((error.response.data.status_code === 401) && (error.response.data.message[0].message === 'El token es inválido o ha expirado')) {
                            console.log(`El Token expiro, id_fallo - ${dataQueja.id} `, error.response.data); 
                            await refreshToken();
                            isValidToken = false;
                        }else{
                            error.response.data.id_queja = dataQueja.id;
                            console.log('La queja no se actualizo - ', error.response.data); 
                            responses.push(error.response.data);
                            isValidToken = true;
                        }
                    }else{
                        console.log(error);
                        console.log('El Error anterior no esta controlado, saliendo de la ejecucion ...');
                        process.exit();
                    }
    
                })
                .finally(async ()=>{
                    if (isValidToken) {
                        const pathResponse = path.join(`${process.env.PATH_RESPONSE_FILES}`, `${getDate()}_DATA.json`);
                        await writeFileResponses(responses, pathResponse);
                        resolve(true);
                    }
                })
    
        } while (!isValidToken);
    })
}

// Genera archivo de python
// async function generateFilePhyton(params) {
//     try{
//         let obj = {
//             'id_queja': '',
//             'type': 'pdf'
//         };

//         let arrayObj = [];

//         dataJson = await getJSON();
//         for (const element of dataJson) {
//             obj.id_queja = element.codigo_queja
//             arrayObj.push(obj);
//         }
//         const pathResponse = path.join(`${process.env.PATH_FILES_PYTHON}`, `dataPython.json`);
//         await writeFileResponses(arrayObj, pathResponse);

//     }catch(error){
//         throw error;
//     }
// }

async function sendFilesSFC(searchId){
    dataJson = await getJSON(process.env.PATH_SIGNS_DOC);
    const foundObject = dataJson.find(item => item.id === searchId);
    if (foundObject) {
        console.log("Objeto encontrado para DOCS:", foundObject);
        const filesFinds = await searchFiles(foundObject.id);
        if (filesFinds.length === 0) return false;        
        const filesToSend = await getFilesFinds(filesFinds);
        return await sendFilesAXIOS(filesToSend, foundObject);
    } else {
        let responses = [`El Objeto no fue encontrado, y el Archivo de Cierre no fue enviado para el caso: ${searchId}`]
        console.log(responses[0]);
        const pathResponse = path.join(`${process.env.PATH_RESPONSE_FILES}`, `${getDate()}_DATA.json`);
        await writeFileResponses(responses, pathResponse);
        return false;
    }
}

async function sendDataSFC() {
    dataJson = await getJSON(process.env.PATH_SIGNS_DATA);
    for (const element of dataJson) {
        console.log(element);
        let sendFile = await sendFilesSFC(element.id);
        console.log(sendFile);
        if (sendFile) await sendDataAXIOS(element);
    }
    process.exit();
}


sendDataSFC();
// refreshToken();