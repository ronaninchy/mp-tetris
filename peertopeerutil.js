const serversConfig = {
    iceServers:[
        {
            urls:['stun:stun1.1.google.com:19302','stun:stun2.1.google.com:19302']
        }
    ]
}


const createOffer = async (element,pc) => {

    pc.onicecandidate = async (event) => {
        //Event that fires off when a new offer ICE candidate is created
        if(event.candidate){
            element.value = JSON.stringify(pc.localDescription)
            //document.getElementById('offer-sdp').value = JSON.stringify(pc.localDescription)
        }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return offer;
}

const createAnswer = async (offer,element,pc) => {

    
    pc.onicecandidate = async (event) => {
        //Event that fires off when a new answer ICE candidate is created
        if(event.candidate){
            console.log('Adding answer candidate...:', event.candidate)
            element.value = JSON.stringify(pc.localDescription)
            //document.getElementById('answer-sdp').value = JSON.stringify(pc.localDescription)
        }
    };

    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    return answer;
}

const addAnswer = async (answer,pc) => {
    console.log('answer:', answer)
    if (!pc.currentRemoteDescription){
        pc.setRemoteDescription(answer);
    }
}

export { addAnswer, createAnswer, createOffer, serversConfig };