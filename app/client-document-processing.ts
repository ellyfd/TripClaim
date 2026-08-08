type OcrWorker={recognize:(image:File|Blob)=>Promise<{data:{text:string}}>};

let workerPromise:Promise<OcrWorker>|null=null;

const worker=()=>{
 if(!workerPromise)workerPromise=import("tesseract.js").then(({createWorker})=>createWorker("eng"));
 return workerPromise;
};

const canvasBlob=(canvas:HTMLCanvasElement,type:string,quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("image_encode_failed")),type,quality));

export async function prepareImageForUpload(file:File){
 if(!file.type.startsWith("image/")||["image/heic","image/heif"].includes(file.type))return {file,warnings:[] as string[]};
 const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"}),limit=2200,scale=Math.min(1,limit/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale)),canvas=document.createElement("canvas");
 canvas.width=width;canvas.height=height;const context=canvas.getContext("2d",{alpha:false});if(!context){bitmap.close();return {file,warnings:[] as string[]}}context.drawImage(bitmap,0,0,width,height);bitmap.close();
 const sample=document.createElement("canvas"),sampleContext=sample.getContext("2d",{willReadFrequently:true}),sampleWidth=Math.min(96,width),sampleHeight=Math.min(96,height);sample.width=sampleWidth;sample.height=sampleHeight;sampleContext?.drawImage(canvas,0,0,sampleWidth,sampleHeight);const pixels=sampleContext?.getImageData(0,0,sampleWidth,sampleHeight).data;let edge=0,count=0;if(pixels)for(let y=1;y<sampleHeight;y++)for(let x=1;x<sampleWidth;x++){const i=(y*sampleWidth+x)*4,left=i-4,up=i-sampleWidth*4,gray=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2],leftGray=.299*pixels[left]+.587*pixels[left+1]+.114*pixels[left+2],upGray=.299*pixels[up]+.587*pixels[up+1]+.114*pixels[up+2];edge+=Math.abs(gray-leftGray)+Math.abs(gray-upGray);count+=2}
 const outputType=file.type==="image/png"?"image/png":"image/jpeg",blob=await canvasBlob(canvas,outputType,outputType==="image/png"?1:.86),prepared=new File([blob],file.name.replace(/\.[^.]+$/,outputType==="image/png"?".png":".jpg"),{type:outputType,lastModified:file.lastModified});
 return {file:prepared,warnings:count&&edge/count<5?["圖片可能模糊，請確認日期與金額"]:[]};
}

export async function recognizeDocumentText(file:File){
 if(!file.type.startsWith("image/")||["image/heic","image/heif"].includes(file.type))return "";
 return (await (await worker()).recognize(file)).data.text;
}
