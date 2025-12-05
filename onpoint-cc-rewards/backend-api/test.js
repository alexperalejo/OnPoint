const controller = require('./controllers/cardController')
const assert = require('node:assert');
const tests = require('node:test');


tests.test('card gets default', () => {
    assert.equal(
    controller.reccomendCard({
        url: "test.com",
        tags: [
            "food"
        ]
    }, [
        {
            id: "correct",
            attributes: [

            ]
        }
    ]), "correct");
})

const testCards = [
    {
        id: "1 percent cashback",
        attributes: [
            {
                type: "all",
                points: 1
            }
        ]
    },
    {
        id: "walmartCard",
        attributes: [
            {
                type: "url",
                value: "walmart.com",
                points: 5
            }
        ]
    },
    {
        id: "foodCard",
        attributes: [
            {
                type: "tag",
                value: "food",
                points: 2.5
            }
        ]
    }
]

tests.test('use the 1 percent card', () => {
    assert.equal(
    controller.reccomendCard({
        url: "test.com",
        tags: [
        ]
    }, testCards), "1 percent cashback");
})
tests.test('use the walmart card', () => {
    assert.equal(
    controller.reccomendCard({
        url: "walmart.com",
        tags: [
            "food"
        ]
    }, testCards), "walmartCard");
})
tests.test('use the food card', () => {
    assert.equal(
    controller.reccomendCard({
        url: "doordash.com",
        tags: [
            "food"
        ]
    }, testCards), "foodCard");
})