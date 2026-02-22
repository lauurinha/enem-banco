const options = {method: 'GET'};
const p = document.getElementById('question')

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max); 
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomQuestion(){
    let year = document.getElementById('year').value 
    let question = getRandomIntInclusive(1, 180)
    const restrictions = document.getElementById('areas').value 

    if (year == 'any'){
        year = getRandomIntInclusive(2009, 2023)
        console.log(year)      
    } else {
        year = parseInt(year)
        console.log(year)
    }

    if (restrictions == 'ling') {
        question = getRandomIntInclusive(1, 45)
        console.log(question)
    } else if (restrictions == 'hum') {
        question = getRandomIntInclusive(46, 90)
        console.log(question)
    } else if (restrictions == 'nat') {
        question = getRandomIntInclusive(91, 135)
        console.log(question)
    } else if (restrictions == 'mat') {
        question = getRandomIntInclusive(136, 180)
        console.log(question)
    } else {
        console.log(question)
    }

    fetchQuestion(year, question)
}

function fetchQuestion(year, index){
    p.textContent = 'Carregando...'
    fetch(`https://api.enem.dev/v1/exams/${year}/questions/${index}`, options)
        .then(res => res.json())
        .then(res => {
            console.log(res)
            const contains_image = res.context.includes('![]')
            console.log(contains_image)
            if (contains_image){
                res.context = ''
            }
            const alternatives = res.alternatives.map(element => 
                `<medium>${element.letter.toLowerCase()}) ${element.text}</medium><br>`
            ).join('')
            let imgs = '';
            if (res.files && res.files.length !== 0){
                imgs = res.files.map(element => `<img src='${element}' width='auto'>`).join('')
            }
            p.innerHTML = `
                <h3>${res.title} (${res.discipline})</h3>
                ${imgs}
                <medium>${res.context}</medium><br><br>
                <medium>${res.alternativesIntroduction}</medium><br><br>
                ${alternatives}
            `
        })
        .catch(err => console.error(err));
}