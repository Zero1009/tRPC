let protoObj = {}
let excelObj = {}
let methodSelected = ''
let filePathProto = ''
let target = ''
function showModal(element){
   const inputProto = document.getElementById('inputProto')
    const inputExcel = document.getElementById('inputExcel')
   if(element.id === 'buttonProto'){
        inputProto.click()
   }else {
        inputExcel.click()
   }
}

function onFileChange(file){
    const fileDetail = file.files[0]
    if(fileDetail.name.includes('.proto')){
        document.getElementById('fileNameProto').innerHTML = fileDetail.name
        filePathProto = fileDetail.path
        showButton(fileDetail)
        getDetailProto(fileDetail.path)
    }else {
        document.getElementById('fileNameExcel').innerHTML = fileDetail.name
        getDetailExcel(fileDetail.path)
    }

}

function showButton(fileDetail){
    document.getElementById('buttonSelectProto').removeAttribute('hidden')
    document.getElementById('buttonSelectProto').innerHTML = fileDetail.name
}

const getDetailExcel = async  (filePath) => {
    excelObj = await  window.versions.readFile(filePath);
    previewExcel(excelObj.messages)
}

const setTarget = () => {
    target = document.getElementById('inputTarget').value
}

const getDetailProto = async (filePath) => {
    protoObj   = await window.versions.readFile(filePath);
}


const showButtonPackage = () => {
    document.getElementById('buttonPackage').removeAttribute('hidden')
    document.getElementById('buttonPackage').innerHTML = protoObj.packageName+'.'+protoObj.serviceName
}

const showButtonMethod = () => {
    console.log(protoObj.methods)
    protoObj.methods.map(name => {
      let option = document.createElement("button");
      document.getElementById('buttonService').appendChild(option);
      option.setAttribute('class', 'btn btn-primary mt-1 mb-2 limit-length-button text-truncate')
        option.setAttribute('id', `${name.methodsName}`)
        option.setAttribute('onclick','selectMethod(this)')
      option.innerHTML = name.methodsName;
  })

}

const selectMethod = (element) => {
    document.getElementById('methodSelected').innerText = element.id
    methodSelected = element.id
}

const previewExcel = (excelContent) => {
    excelContent.map((content, index) => {
        let option = document.createElement('div')
        document.getElementById('previewExcel').appendChild(option)
        option.setAttribute('id', index.toString())
        document.getElementById(index.toString()).innerText =index+ JSON.stringify(content, null, 4)
    })
}


const invokeGrpc = async () => {
    if(excelObj && Object.keys(excelObj).length === 0 && Object.getPrototypeOf(excelObj) === Object.prototype) return;
    const response = await window.versions.callGrpc(excelObj.messages,protoObj.packageName, protoObj.serviceName, methodSelected, filePathProto, target )
    showResponse(response)
}

const showResponse = (results) => {

    results.map((result, index) => {
        let showResultElement = document.createElement('div')
        document.getElementById('showResponse').appendChild(showResultElement)
        showResultElement.setAttribute('id', 'result'+index.toString())
        document.getElementById('result'+index.toString()).innerText = result
    } )
}
