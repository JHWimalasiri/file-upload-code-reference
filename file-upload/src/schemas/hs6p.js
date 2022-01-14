const moment = require('moment');

async function createSchemaHS6P() {
    return {
        'columns' : [
            'Goods code',
            'Hier. Pos.',
            'Description'
        ],
        'Goods code': {
            prop: 'hs6p_code',
            type: (value) => {
                if ((typeof value === 'string')) {
                    return value.replace(/\D/g,'');
                } else {
                    throw new Error('invalid');
                }
            },
            required: true

        },
        'Hier. Pos.': {
            prop: 'position',
            type: Number,
            required: true

        },
        'Description': {
            prop: 'description',
            type: String,
            required: true

        }
    };
}

async function createHs6pList(dataList) {
    let hs6pMap = new Map();
    let excludeRowCount = 0;

    for (const data of dataList) {
        const { position = 0, hs6p_code = '', description } = data;
        const key = hs6p_code.slice(0, position);

        if (!hs6pMap.has(key)) {
            const hs6p = {
                hs6p_code : key,
                description,
                timestamp : moment()
            };
            hs6pMap.set(key, hs6p);
        } else {
            excludeRowCount += 1;
        }
    }

    return  {
        excludeRowCount : excludeRowCount,
        hs6pItems : Array.from(hs6pMap.values())
    };

}

module.exports = {
    createSchemaHS6P,
    createHs6pList
};