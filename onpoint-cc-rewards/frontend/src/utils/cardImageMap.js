// import images
import chaseFreedomFlex from "../assets/cards/chase-freedom-flex.png";
import chaseFreedomUnlimited from "../assets/cards/chase-freedom-unlimited.png";
import chaseSapphirePreferred from "../assets/cards/chase-sapphire-preferred.png";
import amexGold from "../assets/cards/amex-gold.png";
import amexBlueCashPreferred from "../assets/cards/amex-blue-cash-preferred.png";
import citiDoubleCash from "../assets/cards/citi-double-cash.png";
import discoverIt from "../assets/cards/discover-it.png";
import capitalOneSavorOne from "../assets/cards/capital-one-savor-one.png";
import capitalOneVentureX from "../assets/cards/capital-one-venture-x.png";

// lookup table
export const cardImageMap = {
    "chase-freedom-flex": chaseFreedomFlex,
    "chase-freedom-unlimited": chaseFreedomUnlimited,
    "chase-sapphire-preferred": chaseSapphirePreferred,
    "amex-gold": amexGold,
    "amex-blue-cash-preferred": amexBlueCashPreferred,
    "citi-double-cash": citiDoubleCash,
    "discover-it": discoverIt,
    "capital-one-savor-one": capitalOneSavorOne,
    "capital-one-venture-x": capitalOneVentureX
};

// export
export function getCardImage(imageKey) {
    return cardImageMap[imageKey] || cardImageMap["chase-freedom-flex"];
}

