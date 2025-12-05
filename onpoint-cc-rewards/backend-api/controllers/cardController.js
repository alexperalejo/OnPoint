//export enum AttributeType{
//    Url = "url",
//    Tag = "tag",
//    All = "all"
//}
//export type CardAttribute = {
//        type: AttributeType,
//        value: string,
//        points: number
//}
//export type Card = {
//    id: string,
//    attributes: CardAttribute[]
//}
//export type PaymentInfo = {
//    url: string
//    tags: string[]
//}
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