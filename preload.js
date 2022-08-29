const {contextBridge, ipcRenderer} = require('electron')
const {readFileSync} = require('fs')
const parser = require('proto-parser')
const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js')

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    readFile: (filePath) => {
        if(filePath.includes('.proto')){
            return getDetailProto(filePath)
        }else {
            return getDetailExcel(filePath)
        }

    },
    callGrpc:async (messages, packageName, serviceName, methodName, filePathProto, target) => {
        let response = [];
        let count = 0;
        for (let message of messages) {
            count++;
            const res = await sentRequestGrpc({message, packageName, serviceName, methodName, filePathProto, target})
            response.push(count+ ' : ' + res)
        }

        return response
    }
})


function getDetailExcel(filePath){
    const xlsx = require('xlsx')
    const workbook = xlsx.readFile(filePath);
    const response = [];
    const responsetxt = [];

    const sheet_name_list = workbook.SheetNames;

    sheet_name_list.forEach((sheet) => {
        const worksheet = workbook.Sheets[sheet];

        const headers = {};
        var data = [];
        for (z in worksheet) {
            if (z[0] === '!') continue;
            //parse out the column, row, and value
            var col = z.substring(0, 1);
            // console.log(col);

            var row = parseInt(z.substring(1));
            // console.log(row);

            var value = worksheet[z].v;
            // console.log(value);

            //store header names
            if (row == 1) {
                headers[col] = value;
                // storing the header names
                continue;
            }

            if (!data[row]) data[row] = {};
            data[row][headers[col]] = value;
        }
        //drop those first two rows which are empty
        data.shift();
        data.shift();
        data.map(d => {
            response.push(JSON.parse(d.message));
            responsetxt.push(`${JSON.stringify(JSON.parse(d.message))}`);
        })
    })
    return {
        messages: response,
        messagesTxt: responsetxt
    }
}

function getDetailProto(filePath) {
    const data = readFileSync(filePath, 'utf-8')
    const protoDocument = parser.parse(data)
    const methods = [];
    const packageName = protoDocument.package;
    let serviceName = '';
    for(let i in protoDocument.root.nested[packageName].nested){
        if(
            protoDocument.root.nested[packageName].nested[i].methods !== undefined
        ){
            serviceName = i; // Service Name
        }
    }
    for(let i in protoDocument.root.nested[packageName].nested[serviceName].methods){
        // loop by methods number
        let requestName =
            protoDocument.root.nested[packageName].nested[serviceName].methods[i]
                .requestType.value; // method name
        const  messages = [];
        for(let j in protoDocument.root.nested[packageName].nested[requestName].fields){
            //loop by message
            const message = messageProto(
                protoDocument,
                packageName,
                requestName,
                j
            ); // call function to find message
            messages.push(`"${message[0]}":${message[1]}`);
        }
        const methodObj = {
            methodsName: i,
            messages: JSON.parse(`{${messages.toString()}}`)
        };
        // wait to solve solution
        methods.push(methodObj);

    }
    return {
        packageName: packageName,
        serviceName: serviceName,
        methods: methods
    }

}


const messageProto = (protoDocument, packageName, requestName, messageName) => {
    // function หา message ในรูป json
    let m = [];
    if (
        protoDocument.root.nested[packageName].nested[requestName].fields[
            messageName
            ].type.resolvedValue !== undefined
    ) {
        if (
            protoDocument.root.nested[packageName].nested[requestName].fields[
                messageName
                ].rule !== undefined
        ) {
            // object array
            requestName =
                protoDocument.root.nested[packageName].nested[requestName].fields[
                    messageName
                    ].type.value;
            for (let j in protoDocument.root.nested[packageName].nested[requestName]
                .fields) {
                const message = messageProto(
                    protoDocument,
                    packageName,
                    requestName,
                    j
                );
                m.push(`"${message[0]}":${message[1]}`);
            }
            return [messageName, `[{${m.toString()}}]`];
        } else {
            //object
            requestName =
                protoDocument.root.nested[packageName].nested[requestName].fields[
                    messageName
                    ].type.value;
            for (let j in protoDocument.root.nested[packageName].nested[requestName]
                .fields) {
                const message = messageProto(
                    protoDocument,
                    packageName,
                    requestName,
                    j
                );
                m.push(`"${message[0]}":${message[1]}`);
            }
            return [messageName, `{${m.toString()}}`];
        }
    } else {
        if (
            protoDocument.root.nested[packageName].nested[requestName].fields[
                messageName
                ].rule !== undefined
        ) {
            //array
            return [messageName, `[""]`];
        } else {
            //value
            if (
                protoDocument.root.nested[packageName].nested[requestName].fields[
                    messageName
                    ].type.value === 'string'
            ) {
                return [messageName, `""`];
            } else {
                return [messageName, `0`];
            }
        }
    }
}


const sentRequestGrpc = ( req ) => {
    return new Promise((resolve, reject) => {
        const grpcMessage = req.message
        const packageName = req.packageName;
        const serviceName = req.serviceName;
        const methodName = req.methodName;
        const targetIp = req.target;
        const PROTO_PATH = req.filePathProto
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            objects: true,
            arrays: true,
        });
        const proto = grpc.loadPackageDefinition(packageDefinition)[packageName];
        const grpc_client = new proto[serviceName](
            targetIp,
            grpc.credentials.createInsecure()
        );
        if (
            packageDefinition[packageName + '.' + serviceName][methodName].requestStream
        ) {
            const call = grpc_client[methodName]((err, response) => {
                if (err) {
                    resolve(err.message);
                }
                console.log("work request stream")
                resolve(response.message);
            });
            console.log('This is message', grpcMessage)
            call.write(grpcMessage);
            call.end();
        } else {
            grpc_client[methodName](grpcMessage, function (err, response) {
                if (err) {
                    resolve(err.message);
                }
                console.log("work")
                resolve(response);
            });
        }
    })
}
