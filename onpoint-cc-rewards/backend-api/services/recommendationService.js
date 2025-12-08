/**
 * @readonly
 * @enum {string}
 */
const AttributeType = {
    Url: "url",
    Tag: "tag",
    All: "all"
}
/**
 * @typedef {object} CardAttribute
 * @property {AttributeType} type
 * @property {string} value
 * @property {number} points
 */
/**
 * @typedef {object} Card
 * @property {string} id
 * @property {CardAttribute[]} attributes
 */
/**
 * @typedef {object} PaymentInfo
 * @property {string} url
 * @property {string[]} tags
 */

/**
 * Get Points for a card
 * @param {PaymentInfo} paymentInfo 
 * @param {Card} card 
 * @returns {number} The total points that applies from a card.
 */
function getCardPoints(paymentInfo, card)
{
    var points = 0;
    card.attributes.forEach(attribute => {
        switch(attribute.type)
        {
            case "url":
                if(attribute.value == paymentInfo.url)
                {
                    points += attribute.points;
                }
                break;
            case "tag":
                if(paymentInfo.tags.includes(attribute.value))
                {
                    points += attribute.points;
                }
                break;
            case "all":
                points += attribute.points;
                break;
        }
    });
    return points;
}
/**
 * Get the reccomended card for a list of cards
 * @param {PaymentInfo} paymentInfo 
 * @param {Card[]} cards 
 * @returns {string} The id of the best card
 */
function reccomendCard(paymentInfo, cards)
{
    if(cards.length == 0) return null;
    var reccommendedCardId = null;
    var maxPoints = -1;
    cards.forEach(card => {
        var points = getCardPoints(paymentInfo, card);
        if(points > maxPoints)
        {
            reccommendedCardId = card.id;
            maxPoints = points;
        }
    });
    return reccommendedCardId;
}
module.exports = {reccomendCard: reccomendCard};
