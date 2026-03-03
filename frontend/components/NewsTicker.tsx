import React, { useEffect, useMemo, useState } from "react";
import { Globe, TrendingDown, TrendingUp, Zap } from "lucide-react";

import { getMarketTicker, type MarketTickerNews, type MarketTickerQuote } from "../services/api";

type TickerItem = {
  text: string;
  value?: string;
  change: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
};

const fallbackItems: TickerItem[] = [
  { text: "PETR4", value: "R$ 41,13", change: "+6,58%", icon: TrendingUp, color: "text-emerald-500" },
  { text: "VALE3", value: "R$ 51,87", change: "+2,11%", icon: TrendingUp, color: "text-emerald-500" },
  { text: "ITUB4", value: "R$ 31,84", change: "+1,40%", icon: TrendingUp, color: "text-emerald-500" },
  { text: "BBAS3", value: "R$ 27,58", change: "+1,62%", icon: TrendingUp, color: "text-emerald-500" },
  { text: "USD/BRL", value: "R$ 5,1691", change: "-0,57%", icon: TrendingDown, color: "text-red-500" },
  { text: "Mercado acompanha inflacao e juros globais", change: "MERCADO", icon: Globe, color: "text-blue-500" },
  { text: "Volatilidade aumenta em tecnologia", change: "NOTICIA", icon: Zap, color: "text-amber-500" },
];

function formatPrice(quote: MarketTickerQuote) {
  const currency = (quote.currency || "").toUpperCase();
  if (quote.symbol === "USD/BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(quote.price);
  }
  if (currency === "USD") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(quote.price);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(quote.price);
}

function formatChange(changePct: number | null) {
  if (changePct === null || Number.isNaN(changePct)) return "N/D";
  const sign = changePct > 0 ? "+" : "";
  return `${sign}${changePct.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function quoteToTickerItem(quote: MarketTickerQuote): TickerItem {
  const change = formatChange(quote.change_pct);
  const up = (quote.change_pct ?? 0) >= 0;
  return {
    text: quote.symbol,
    value: formatPrice(quote),
    change,
    icon: up ? TrendingUp : TrendingDown,
    color: up ? "text-emerald-500" : "text-red-500",
  };
}

function newsToTickerItem(news: MarketTickerNews): TickerItem {
  return {
    text: news.title,
    change: "NOTICIA",
    href: news.url,
    icon: Globe,
    color: "text-blue-500",
  };
}

const NewsTicker: React.FC = () => {
  const [quotes, setQuotes] = useState<MarketTickerQuote[]>([]);
  const [news, setNews] = useState<MarketTickerNews[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getMarketTicker();
        if (cancelled) return;
        setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
        setNews(Array.isArray(data.news) ? data.news : []);
      } catch {
        if (cancelled) return;
        setQuotes([]);
        setNews([]);
      }
    };

    load();
    const timer = window.setInterval(load, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const tickerItems: TickerItem[] = useMemo(() => {
    const quoteItems = quotes.slice(0, 5).map(quoteToTickerItem);
    const newsItems = news.slice(0, 5).map(newsToTickerItem);
    const all = [...quoteItems, ...newsItems];
    return all.length > 0 ? all : fallbackItems;
  }, [news, quotes]);

  const TickerRowItem = ({ item }: { item: TickerItem }) => {
    const content = (
      <>
        <item.icon size={14} className={`${item.color} shrink-0`} />
        <span className="text-xs font-bold text-slate-300">{item.text}</span>
        {item.value ? <span className="text-xs font-mono text-slate-400">{item.value}</span> : null}
        <span className={`text-xs font-mono ${item.color}`}>{item.change}</span>
      </>
    );

    if (item.href) {
      return (
        <a
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center shrink-0 gap-2 mx-6 hover:opacity-90"
          title={item.text}
        >
          {content}
        </a>
      );
    }

    return <div className="flex items-center shrink-0 gap-2 mx-6">{content}</div>;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 bg-slate-900/90 backdrop-blur-sm border-t border-slate-800 z-30 overflow-hidden">
      <div className="w-full h-full flex items-center whitespace-nowrap">
        <div className="flex animate-marquee">
          {tickerItems.map((item, index) => (
            <TickerRowItem key={`${item.text}-${index}`} item={item} />
          ))}
          {tickerItems.map((item, index) => (
            <TickerRowItem key={`dup-${item.text}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </footer>
  );
};

export default NewsTicker;
