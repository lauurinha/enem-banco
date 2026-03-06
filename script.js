const options = {method: 'GET'};
const p = document.getElementById('question');

let current_question = {};
let pdf_list = [];
let ul = undefined;
const root = document.documentElement; 

const CORES = {
    rosa:        '#ffb6a9',  
    pele:        '#fcd5ce',  
    creme:       '#fae1dd',  
    brancoPale:  '#f8edeb',  
    cinzaClaro:  '#e8e8e4',  
    sageClaro:   '#a5a58d', 
    areia:       '#ffdece',  
    pessego:     '#ffe5d9', 
    laranjaPale: '#ffd7ba', 
    ambar:       '#fec89a',  
    marrom:      '#5C3D2E',  
    marromMedio: '#7B5041',  
};

Object.keys(CORES).forEach(key => {
  root.style.setProperty(`--color-${key}`, CORES[key]);
});

// fonts
pdfMake.fonts = {
    Lato: {
        normal:      'https://cdnjs.cloudflare.com/ajax/libs/lato-font/3.0.0/fonts/lato-normal/lato-normal.woff',
        bold:        'https://cdnjs.cloudflare.com/ajax/libs/lato-font/3.0.0/fonts/lato-bold/lato-bold.woff',
        italics:     'https://cdnjs.cloudflare.com/ajax/libs/lato-font/3.0.0/fonts/lato-light/lato-light.woff',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/lato-font/3.0.0/fonts/lato-bold/lato-bold.woff',
    },
    // fallback
    Roboto: {
        normal:      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
        bold:        'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
        italics:     'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf',
    }
};


function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function getDisciplina(slug) {
    const map = {
        'ciencias-natureza': 'Ciências da Natureza',
        'ciencias-humanas':  'Ciências Humanas',
        'matematica':        'Matemática',
        'linguagens':        'Linguagens e Códigos'
    };
    return map[slug] || slug;
}

// img url -> base64
async function urlParaBase64(url) {
    try {
        const res  = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror   = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

function randomQuestion() {
    let year       = document.getElementById('year').value;
    let question   = getRandomIntInclusive(1, 180);
    const restricao = document.getElementById('areas').value;

    year = year === 'any' ? getRandomIntInclusive(2009, 2023) : parseInt(year);

    if      (restricao === 'ling') question = getRandomIntInclusive(1,   45);
    else if (restricao === 'hum')  question = getRandomIntInclusive(46,  90);
    else if (restricao === 'nat')  question = getRandomIntInclusive(91, 135);
    else if (restricao === 'mat')  question = getRandomIntInclusive(136, 180);

    fetchQuestion(year, question);
}


function fetchQuestion(year, index) {
    p.textContent = 'Carregando...';
    if (document.querySelector('.questionBlock') == null){
        const questionBlock = document.createElement('div')
        questionBlock.classList.add("questionBlock")
        questionBlock.appendChild(p)
        document.body.appendChild(questionBlock)
    }
    fetch(`https://api.enem.dev/v1/exams/${year}/questions/${index}`, options)
        .then(res => res.json())
        .then(res => {
            current_question = res;

            if (res.context?.includes('![]')) res.context = '';

            const alternatives = res.alternatives.map(alt => {
                if (alt.text) {
                    return `<p>${alt.letter.toLowerCase()}) ${alt.text}</p>`;
                } else {
                    return `<p>${alt.letter.toLowerCase()}) <img src="${alt.file}" width="auto" height="50px"></p>`;
                }
            }).join('');

            const imgs = (res.files?.length)
                ? res.files.map(f => `<img src="${f}" width="auto">`).join('')
                : '';

            p.innerHTML = `
                <h3>${res.title} (${getDisciplina(res.discipline)})</h3>
                ${imgs}
                <p>${res.context ?? ''}</p>
                <p>${res.alternativesIntroduction ?? ''}</p>
                ${alternatives}
            `;


            const btn = document.createElement('button')
            const btnAnswer = document.createElement('button')
            btn.innerText = 'Adicionar à Lista'
            btnAnswer.innerText = 'Gabarito'
            btn.addEventListener('click', addToList)
            btnAnswer.addEventListener('click', showAnswer)
            btnAnswer.classList.add('btnAnswer')
            p.appendChild(btn)
            p.appendChild(btnAnswer)
        })
        .catch(err => console.error(err));
}


function addToList() {
    if (pdf_list.includes(current_question)) {
        alert('ERRO! Essa questão já está na lista...');
        return;
    }

    pdf_list.push(current_question);

    if (pdf_list.length === 1) {
        const divList  = document.createElement('div');
        ul             = document.createElement('ul');
        const title    = document.createElement('h3');
        const btnCreate = document.createElement('button');

        title.textContent  = 'Montar Lista PDF';
        btnCreate.innerHTML = 'Criar Lista PDF';
        btnCreate.addEventListener('click', createPDF);

        divList.classList.add("divList")

        divList.appendChild(title);
        divList.appendChild(ul);
        divList.appendChild(btnCreate);
        document.body.appendChild(divList)
    }

    ul.innerHTML = '';
    pdf_list.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.title;
        ul.appendChild(li);
    });
}

function showAnswer(){
    const questionBlock = document.querySelector('.questionBlock')
    const gabarito = document.createElement('h5')
    gabarito.textContent = 'Gabarito: Letra ' + current_question?.correctAlternative.toUpperCase()
    questionBlock.appendChild(gabarito)
}

async function createPDF() {

    // preload images
    const imgsPerQ = await Promise.all(
        pdf_list.map(async (q) => {
            // enunciado
            const files = await Promise.all(
                (q.files ?? []).map(url => urlParaBase64(url))
            );

            // alternativas
            const altFiles = await Promise.all(
                q.alternatives.map(alt =>
                    alt.file ? urlParaBase64(alt.file) : Promise.resolve(null)
                )
            );

            return { files, altFiles };
        })
    );

    const questoes = [];

    pdf_list.forEach((q, idx) => {
        const imgs    = imgsPerQ[idx];
        const disciplina = getDisciplina(q.discipline);


        questoes.push({
            text: `Questão ${idx + 1}  ·  ${q.title}  ·  ${disciplina}`,
            style: 'cabecalhoQuestao',
            margin: [0, 20, 0, 8]
        });


        if (q.context?.trim()) {
            questoes.push({ text: q.context, style: 'corpo', margin: [0, 0, 0, 8] });
        }

        // imgs enunciado
        imgs.files.forEach(base64 => {
            if (base64) {
                questoes.push({ image: base64, fit: [240, 150], margin: [0, 0, 0, 8] });
            }
        });


        if (q.alternativesIntroduction?.trim()) {
            questoes.push({ text: q.alternativesIntroduction, style: 'corpo', margin: [0, 0, 0, 8] });
        }

        q.alternatives.forEach((alt, i) => {
            const fundoAlt = i % 2 === 0 ? CORES.brancoPale : CORES.pessego;
            const base64Alt = imgs.altFiles[i];

            if (base64Alt) {
                // c/ img
                questoes.push({
                    columns: [
                        { text: `${alt.letter.toUpperCase()})`, style: 'letraAlt', width: 24 },
                        { image: base64Alt, fit: [110, 50] }
                    ],
                    fillColor: fundoAlt,
                    margin: [8, 4, 8, 4]
                });
            } else {
                // s/ img
                questoes.push({
                    text: `${alt.letter.toUpperCase()})  ${alt.text}`,
                    style: 'alternativa',
                    fillColor: fundoAlt,
                    margin: [8, 5, 8, 5]
                });
            }
        });

        // separar questões
        if (idx < pdf_list.length - 1) {
            questoes.push({
                canvas: [{
                    type: 'line',
                    x1: 0, y1: 8, x2: 515, y2: 8,
                    lineWidth: 1,
                    lineColor: CORES.ambar
                }],
                margin: [0, 16, 0, 0]
            });
        }
    });


    const gabarito = [
        { text: '', pageBreak: 'before' },
        { text: '# Gabarito', style: 'tituloPagina', margin: [0, 0, 0, 16] },
        {
            table: {
                headerRows: 1,
                widths: [30, '*', 150, 55],
                body: [
                    ['Nº', 'Questão', 'Disciplina', 'Resposta'].map(txt => ({
                        text: txt, bold: true, color: CORES.marrom,
                        fillColor: CORES.laranjaPale, margin: [6, 6, 6, 6], fontSize: 10
                    })),
                    ...pdf_list.map((q, idx) => [
                        { text: String(idx + 1), alignment: 'center', margin: [6, 5, 6, 5] },
                        { text: q.title,          margin: [6, 5, 6, 5] },
                        { text: getDisciplina(q.discipline), margin: [6, 5, 6, 5] },
                        {
                            text: q.correctAlternative?.toUpperCase() ?? '—',
                            alignment: 'center', bold: true,
                            color: CORES.marrom, margin: [6, 5, 6, 5]
                        }
                    ])
                ]
            },
            layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0,
                hLineColor: () => CORES.ambar,
                fillColor:  (row) => row > 0 && row % 2 === 0 ? CORES.pele : null
            }
        }
    ];

    const docDefinition = {
        pageSize:    'A4',
        pageMargins: [40, 55, 40, 45],

        header: (pag, total) => ({
            text: `Banco de Questões ENEM  ·  pág. ${pag}/${total}`,
            style: 'header', margin: [40, 16, 40, 0]
        }),

        footer: () => ({
            text: '"if not now, then when?" · Banco de Questões ENEM',
            style: 'footer', margin: [40, 0, 40, 16]
        }),

        content: [
            // capa
            { text: '\n\n\n\n' },
            { text: 'Banco de Questões', style: 'capaTitulo' },
            { text: 'ENEM',           style: 'capaEnem'   },
            {
                text: `${pdf_list.length} questão(ões)  ·  ${new Date().toLocaleDateString('pt-BR')}`,
                style: 'capaData'
            },
            { text: '', pageBreak: 'after' },

            // seçao de questoes
            { text: '# Questões', style: 'tituloPagina', margin: [0, 0, 0, 8] },
            ...questoes,

            // gabarito
            ...gabarito
        ],

        styles: {
            header:           { fontSize: 9,  color: CORES.marromMedio, alignment: 'right' },
            footer:           { fontSize: 8,  color: CORES.marromMedio, alignment: 'center' },
            capaTitulo:       { fontSize: 30, bold: true, color: CORES.rosa, alignment: 'center', margin: [0, 0, 0, 8] },
            capaEnem:         { fontSize: 54, bold: true, color: CORES.sageClaro, alignment: 'center', margin: [0, 0, 0, 16] },
            capaData:         { fontSize: 13, color: CORES.marromMedio, alignment: 'center', italics: true },
            tituloPagina:     { fontSize: 18, bold: true, color: CORES.marrom },
            cabecalhoQuestao: { fontSize: 11, bold: true, color: CORES.marrom },
            corpo:            { fontSize: 11, color: CORES.marrom, lineHeight: 1.5 },
            alternativa:      { fontSize: 11, color: CORES.marrom },
            letraAlt:         { fontSize: 11, bold: true, color: CORES.marrom },
            aviso:            { fontSize: 9,  color: CORES.marromMedio, italics: true }
        },

        defaultStyle: {
            font:     'Lato', 
            fontSize: 11,
            color:    CORES.marrom
        }
    };

    pdfMake.createPdf(docDefinition).open();
    pdfMake.createPdf(docDefinition).download(`lista-enem-${pdf_list.length}questoes.pdf`);
}