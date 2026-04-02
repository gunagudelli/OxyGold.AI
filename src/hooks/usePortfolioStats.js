import { useGold } from '../context/GoldContext';

const usePortfolioStats = () => {
  const { state: { goldPrice, portfolio } } = useGold();

  const currentValue  = parseFloat((portfolio.totalGrams * goldPrice.pricePerGram).toFixed(2));
  const profitLoss    = parseFloat((currentValue - portfolio.totalInvested).toFixed(2));
  const profitPercent = portfolio.totalInvested > 0
    ? parseFloat(((profitLoss / portfolio.totalInvested) * 100).toFixed(2))
    : 0;
  const avgBuyPrice   = portfolio.totalGrams > 0
    ? parseFloat((portfolio.totalInvested / portfolio.totalGrams).toFixed(2))
    : 0;
  const isProfit      = profitLoss >= 0;

  return { currentValue, profitLoss, profitPercent, avgBuyPrice, isProfit };
};

export default usePortfolioStats;
