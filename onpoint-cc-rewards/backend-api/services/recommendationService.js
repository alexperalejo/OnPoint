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
 * @typedef {object} BreakdownElement
 * @property {number} points
 * @property {number} contribution
 * @property {string} from
 */

/**
 * @typedef {object} CardRewards
 * @property {number} points
 * @property {BreakdownElement[]} breakdown
 */

/**
 * Get Points for a card
 * @param {PaymentInfo} paymentInfo 
 * @param {Card} card 
 * @returns {CardRewards} The rewards card.
 */
function getCardRewards(paymentInfo, card)
{
    var points = 0;
    /**
     * @type {{points:number,from:string}[]}
     */
    var breakdown = [];
    card.attributes.forEach(attribute => {
        switch(attribute.type)
        {
            case "url":
                if(attribute.value == paymentInfo.url)
                {
                    points += attribute.points;
                    breakdown.push({points: attribute.points, from: paymentInfo.url});
                }
                break;
            case "tag":
                if(paymentInfo.tags.includes(attribute.value))
                {
                    points += attribute.points;
                    breakdown.push({points: attribute.points, from: attribute.value});
                }
                break;
            case "all":
                points += attribute.points;
                breakdown.push({points: attribute.points, from: 'cashback'});
                break;
        }
    });
    return {
        points: points,
        breakdown: breakdown.map(b => { return {points: b.points, contribution: b.points/points, from: b.from} })
    };
}
module.exports = {getCardRewards: getCardRewards};
