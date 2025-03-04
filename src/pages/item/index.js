import React, { Suspense, useMemo, useEffect } from 'react';
import {Helmet} from 'react-helmet';
import {
    useParams,
    Navigate,
} from "react-router-dom";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; // optional
import { useSelector, useDispatch } from 'react-redux';
import Icon from '@mdi/react'
import { mdiLock } from '@mdi/js';

// import CraftsTable from '../../components/crafts-table';
import BartersTable from '../../components/barters-table';
import QuestsList from '../../components/quests-list'
import CanvasGrid from '../../components/canvas-grid';
import warningIcon from '../../images/icon-warning.png';
import ErrorPage from '../../components/error-page';
import Loading from '../../components/loading';
import LoyaltyLevelIcon from '../../components/loyalty-level-icon';
import PropertyList from '../../components/property-list';
import ItemsForHideout from '../../components/items-for-hideout';

import formatPrice from '../../modules/format-price';
import fleaFee from '../../modules/flea-market-fee';
import { selectAllItems, fetchItems } from '../../features/items/itemsSlice';

import Quests from '../../Quests';

import './index.css';


const CraftsTable = React.lazy(() => import('../../components/crafts-table'));

function TraderPrice ({currency, price}) {
    if(currency === 'USD'){
        return <Tippy
            content = {formatPrice(price * 124)}
            placement = 'bottom'
        >
            <div>
                {formatPrice(price , 'USD')}
            </div>
        </Tippy>
    }

    if(currency === 'EUR'){
        return <Tippy
            content = {formatPrice(price * 147)}
            placement = 'bottom'
        >
            <div>
                {formatPrice(price, 'EUR')}
            </div>
        </Tippy>
    }

    return formatPrice(price);
};

function Item() {
    const {itemName} = useParams();
    const dispatch = useDispatch();
    const items = useSelector(selectAllItems);
    const itemStatus = useSelector((state) => {
        return state.items.status;
    });

    useEffect(() => {
        let timer = false;
        if (itemStatus === 'idle') {
            dispatch(fetchItems());
        }

        if(!timer){
            timer = setInterval(() => {
                dispatch(fetchItems());
            }, 600000);
        }

        return () => {
            clearInterval(timer);
        }
    }, [itemStatus, dispatch]);

    let currentItemData = items.find(item => {
        return item.normalizedName === itemName;
    });
    let redirect = false;

    if(!currentItemData){
        currentItemData = items.find(item => item.id === itemName);

        if(currentItemData){
            redirect = true;
        }
    }

    const itemQuests = useMemo(() => {
        return Quests
            .filter((questData) => {
                const requiresItem = questData.objectives
                    .find((objectiveData) => {
                        return objectiveData.targetId === currentItemData?.id;
                    });

                if (!requiresItem) {
                    return false;
                }

                questData.objectives = questData.objectives.filter(({ targetId }) => targetId === currentItemData?.id)

                questData.objectives.forEach(objectiveData => {
                    if (objectiveData.targetId === currentItemData?.id) {
                        objectiveData.iconLink = currentItemData.iconLink;
                        objectiveData.name = currentItemData.name;
                    }
                })

                return true;
            });
    }, [currentItemData]);

    if(redirect){
        return <Navigate
            to={`/item/${currentItemData.normalizedName}`}
            replace
        />;
    }

    if(!currentItemData && (itemStatus === 'idle' || itemStatus === 'loading')){
        return <Loading />;
    }

    if(!currentItemData && (itemStatus === 'succeeded' || itemStatus === 'failed')){
        return <ErrorPage />;
    }

    const traderIsBest = currentItemData.traderPrice > currentItemData.lastLowPrice - fleaFee(currentItemData.avg24hPrice, currentItemData.basePrice) ? true : false;
    const useFleaPrice = currentItemData.avg24hPrice <= currentItemData.bestPrice;

    return [
        <Helmet
            key = {'loot-tier-helmet'}
        >
            <meta charSet="utf-8" />
            <title>
                {`${currentItemData.name} - Escape from Tarkov`}
            </title>
            <meta
                name="description"
                content= {`All the relevant information about ${currentItemData.name}`}
            />
            <link
                rel = 'canonical'
                href = {`https://tarkov-tools.com/item/${currentItemData.normalizedName}`}
            />
        </Helmet>,
        <div
            className="display-wrapper"
            key = {'display-wrapper'}
        >
            <div
                className = {'item-page-wrapper'}
            >
                <div
                    className = 'information-grid'
                >
                    <h1>
                        {currentItemData.name}
                        <cite>
                            {currentItemData.shortName}
                        </cite>
                    </h1>
                    <div
                        className = 'icon-and-link-wrapper'
                    >
                        {currentItemData.grid && <CanvasGrid
                            height = {currentItemData.grid.height}
                            grid = {currentItemData.grid.pockets}
                            width = {currentItemData.grid.width}
                        />}
                        {currentItemData.gridImageLink && <img
                            className = {'item-image'}
                            alt = {currentItemData.name}
                            src = {currentItemData.gridImageLink}
                        /> }
                        {currentItemData.wikiLink &&
                            <a
                                href={currentItemData.wikiLink}
                            >Wiki</a>
                        }
                    </div>

                </div>
                <div
                    className = 'trader-wrapper'
                >
                    <div>
                        <h2>
                            Sell for
                        </h2>
                        <div className={'information-grid'}>
                        {!currentItemData.types.includes('noFlea') &&
                            <Tippy
                                placement = 'bottom'
                                content={
                                <div>
                                    <div
                                        className = 'tooltip-calculation'
                                    >
                                        Best price to sell for <div className = 'tooltip-price-wrapper'>{useFleaPrice ? formatPrice(currentItemData.lastLowPrice) : formatPrice(currentItemData.bestPrice)}</div>
                                    </div>
                                    <div
                                        className = 'tooltip-calculation'
                                    >
                                        Fee <div className = 'tooltip-price-wrapper'>{useFleaPrice ? formatPrice(fleaFee(currentItemData.lastLowPrice, currentItemData.basePrice)) : formatPrice(currentItemData.bestPriceFee)}</div>
                                    </div>
                                    <div
                                        className = 'tooltip-calculation'
                                    >
                                        Profit <div className = 'tooltip-price-wrapper'>{useFleaPrice ? formatPrice(currentItemData.lastLowPrice - fleaFee(currentItemData.lastLowPrice, currentItemData.basePrice)) : formatPrice(currentItemData.bestPrice - currentItemData.bestPriceFee)}</div>
                                    </div>
                                </div>}
                            >
                                <div
                                    className = {`text-and-image-information-wrapper ${traderIsBest ? '' : 'best-profit'}`}
                                >
                                    <img
                                        alt = 'Flea market'
                                        height = '86'
                                        width = '86'
                                        src = {`${ process.env.PUBLIC_URL }/images/flea-market-icon.jpg`}
                                        // title = {`Sell ${currentItemData.name} on the Flea market`}
                                    />
                                    <div
                                        className = 'price-wrapper'
                                    >
                                        {!useFleaPrice && <Tippy
                                            placement = 'bottom'
                                            content={ <div>This item is currently being sold for {formatPrice(currentItemData.lastLowPrice)} on the Flea Market.
                                    However, due to how fees are calculated you're better off selling for {formatPrice(currentItemData.bestPrice)}</div>}
                                            >
                                                <img
                                                    alt = 'Warning'
                                                    className = 'warning-icon'
                                                    src = {warningIcon}
                                                />
                                            </Tippy>
                                        }
                                        <span>
                                            {formatPrice(useFleaPrice ? currentItemData.lastLowPrice : currentItemData.bestPrice)}
                                        </span>
                                    </div>
                                </div>
                            </Tippy>
                        }
                        {!currentItemData.types.includes('noFlea') && <div
                            className = {`text-and-image-information-wrapper price-info-wrapper`}
                        >
                            <div
                                className = 'price-wrapper'
                            >
                                <div>
                                    Change vs yesterday: {currentItemData.changeLast48h} %
                                </div>
                                <div>
                                    Lowest scanned price last 24h: {formatPrice(currentItemData.low24hPrice)}
                                </div>
                                <div>
                                    Highest scanned price last 24h: {formatPrice(currentItemData.high24hPrice)}
                                </div>
                            </div>
                        </div>}
                        {currentItemData.traderPrices && currentItemData.traderPrices.length > 0 &&
                            <div
                                className = {`text-and-image-information-wrapper ${traderIsBest ? 'best-profit' : ''} first-trader-price`}
                            >
                                <img
                                    alt = {currentItemData.traderName}
                                    height = '86'
                                    width = '86'
                                    src = {`${ process.env.PUBLIC_URL }/images/${currentItemData.traderName.toLowerCase()}-icon.jpg`}
                                    // title = {`Sell ${currentItemData.name} on the Flea market`}
                                />
                                <div
                                    className = 'price-wrapper'
                                >
                                    {formatPrice(currentItemData.traderPrice)}
                                </div>
                            </div>
                        }
                        {currentItemData.traderPrices && currentItemData.traderPrices.map((traderPrice) => {
                            const traderName = traderPrice.trader.toLowerCase();

                            return <div
                                className = {`text-and-image-information-wrapper`}
                                key = {`${currentItemData.id}-trader-price-${traderName}`}
                            >
                                <img
                                    alt = {traderName}
                                    height = '86'
                                    width = '86'
                                    src = {`${ process.env.PUBLIC_URL }/images/${traderName}-icon.jpg`}
                                    // title = {`Sell ${currentItemData.name} on the Flea market`}
                                />
                                <div
                                    className = 'price-wrapper'
                                >
                                    {traderName === 'peacekeeper' ? <Tippy
                                        content = {formatPrice(traderPrice.price)}
                                        placement = 'bottom'
                                    >
                                        <div>
                                            {formatPrice(traderPrice.price / 124, 'USD')}
                                        </div>
                                    </Tippy> : formatPrice(traderPrice.price)}
                                </div>
                            </div>
                        })}
                        </div>
                    </div>
                    {currentItemData.buyFor && currentItemData.buyFor.length > 0 && <div>
                        <h2>
                            Buy for
                        </h2>
                        <div
                            className = 'information-grid single-line-grid'
                        >
                        {currentItemData.buyFor.map((buyPrice, index) => {
                            const loyaltyLevel = buyPrice.requirements.find(requirement => requirement.type === 'loyaltyLevel')?.value;
                            return <div
                                className = {`text-and-image-information-wrapper`}
                                key = {`${currentItemData.id}-trader-price-${buyPrice.source}`}
                            >
                                <div
                                    className = 'source-wrapper'
                                >
                                    {buyPrice.source !== 'flea-market' && <LoyaltyLevelIcon
                                        loyaltyLevel = {loyaltyLevel}
                                    />}
                                    {buyPrice.requirements.find(requirement => requirement.type === 'questCompleted') &&
                                    <Tippy
                                        content = {'Locked behind a quest'}
                                    >
                                        <div
                                            className = 'quest-icon-wrapper'
                                        >
                                            <Icon
                                                path={mdiLock}
                                                size={1}
                                                className = 'icon-with-text'
                                            />
                                        </div>
                                    </Tippy>
                                    }
                                    <img
                                        alt = {buyPrice.requirements.source}
                                        height = '86'
                                        width = '86'
                                        src = {`${ process.env.PUBLIC_URL }/images/${buyPrice.source.toLowerCase()}-icon.jpg`}
                                    />
                                </div>
                                <div
                                    className = {`price-wrapper ${index === 0 ? 'best-profit' : ''}`}
                                >
                                    <TraderPrice
                                        currency = {buyPrice.currency}
                                        price = {buyPrice.price}
                                    />
                                </div>
                            </div>
                        })}
                        </div>
                    </div> }
                </div>
                <h2>
                    Stats
                </h2>
                <PropertyList
                    properties = {currentItemData.itemProperties}
                />
                <div>
                    <h2>
                        Barters with {currentItemData.name}
                    </h2>
                    <BartersTable
                        itemFilter = {currentItemData.id}
                    />
                </div>
                <div>
                    <h2>
                        Crafts with {currentItemData.name}
                    </h2>
                    <Suspense fallback={<div>Loading...</div>}>
                        <CraftsTable
                            itemFilter = {currentItemData.id}
                        />
                    </Suspense>
                </div>
                <div>
                    <h2>
                        Hideout modules needing {currentItemData.name}
                    </h2>
                    <Suspense fallback={<div>Loading...</div>}>
                        <ItemsForHideout
                            itemFilter = {currentItemData.id}
                        />
                    </Suspense>
                </div>
                <QuestsList
                    itemQuests = {itemQuests}
                />
                {/* <pre>
                    {JSON.stringify(currentItemData, null, 4)}
                </pre> */}
            </div>
        </div>,
    ];
};

export default Item;


