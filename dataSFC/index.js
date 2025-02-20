require('dotenv').config();
const fs = require('fs');
const path = require('path');
const formData = require('form-data');
const { default: axios } = require('axios');

let dataJson = '';

async function getJSON() {
    try {
        return await JSON.parse(fs.readFileSync(process.env.PATH_DATA, 'utf8'));
    } catch (error) {
        throw error;
    }
}

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

function sendFilesAXIOS(files, idQueja) {
    let responses = [];
    files.forEach(async (file)=>{
        const form = new formData();
        form.append('file', file);
        form.append('codigo_queja', idQueja);
        form.append('type', 'pdf');

        axios.post(`${process.env.URL_BASE}storage/`, form, {
            headers: {
                'Authorization': `Bearer ${process.env.TOKEN}`,
                'Content-Type': 'multipart/form-data',
                'X-SFC-Signature': '893C1F4A52DFB844321BD9A2DF09A221E4486C6219DF8FCCC63155D712DD2B37',
            }
        }).then((response)=>{
            response.data.id_queja = idQueja;
            responses.push(response.data);
        })
        .catch((error)=>{
            error.response.data.id_queja = idQueja;
            responses.push(error.response.data);
            console.log(error.response.data);
        })
        .finally(async ()=> {
            const pathResponse = path.join(`${process.env.PATH_RESPONSE_FILES}`, `${getDate()}.json`);
            await writeFileResponses(responses, pathResponse);
        })
    }) 
}

// Genera archivo de python
async function generateFilePhyton(params) {
    try{
        let obj = {
            'id_queja': '',
            'type': 'pdf'
        };

        let arrayObj = [];

        dataJson = await getJSON();
        for (const element of dataJson) {
            obj.id_queja = element.codigo_queja
            arrayObj.push(obj);
        }
        const pathResponse = path.join(`${process.env.PATH_FILES_PYTHON}`, `dataPython.json`);
        await writeFileResponses(arrayObj, pathResponse);

    }catch(error){
        throw error;
    }
}

async function sendFilesSFC(){
    dataJson = await getJSON();
    for (const element of dataJson) {        
        const filesFinds = await searchFiles(element.codigo_queja);
        if (filesFinds.length === 0) return;
        const filesToSend = await getFilesFinds(filesFinds);
        await sendFilesAXIOS(filesToSend, element.codigo_queja);
        return;
    }
}


// generateFilePhyton();
console.log(JSON.stringify(getJSON()));
