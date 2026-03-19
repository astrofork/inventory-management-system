package com.kirana.mlService;


import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.beans.factory.annotation.Value;
import com.kirana.entity.Item;
import com.kirana.mlDto.ForecastResponse;
import com.kirana.mlDto.RecommendationResponse;
import com.kirana.mlDto.ItemRecommendationDecision;
import com.kirana.mlDto.TrendResponse;
import com.kirana.repository.ItemRepository;
import com.kirana.mlDto.ItemDecisionResponse;
import com.kirana.mlDto.CategoryTrendDecision;
import java.util.List;
import java.util.ArrayList;


@Service
public class ForecastService {


  private final ItemRepository itemRepository;
  @Value("${ml.service.url}")
  private final String mlServiceUrl;
  private final RestTemplate restTemplate;

  public ForecastService(
            ItemRepository itemRepository,
            RestTemplate restTemplate,
            @Value("${ml.service.url}") String mlServiceUrl
  ) {
        this.itemRepository = itemRepository;
        this.restTemplate = restTemplate;
        this.mlServiceUrl = mlServiceUrl;
  }

public ItemDecisionResponse getItemForecast(long itemId, int days, long retailerId) {

    Item item = itemRepository
        .findByIdAndRetailerIdAndDeletedAtIsNull(itemId, retailerId)
        .orElseThrow(() -> new RuntimeException("Item is not found or unauthorized"));

    try {
        String url = mlServiceUrl + "/forecast/item/" + item.getId()
                + "?days=" + days
                + "&retailer_id=" + item.getRetailerId();

        // 1. Call ML (same as before)
        ForecastResponse forecast = restTemplate.getForObject(url, ForecastResponse.class);

        // 2. Extract ML output
        double avgDaily = forecast.getAvgDaily();
        double stock = item.getCurrentStock().doubleValue();

        // 3. Build decision 
        ItemDecisionResponse res = new ItemDecisionResponse();

        res.setItemId(item.getId());
        res.setItemName(item.getName());
        res.setDailySale(Math.round(avgDaily));
        res.setStock(stock);

        // Edge case
        if (avgDaily <= 0) {
            res.setDaysLeft(0);
            res.setAction("NO_DATA");
            res.setMessage("Sales data ledu");
            return res;
        }

        double daysLeft = stock / avgDaily;
        res.setDaysLeft(Math.round(daysLeft));

        //  Decision logic
        if (stock == 0) {
            res.setAction("BUY");
            res.setMessage("Out of stock → Konandi");
        } else if (daysLeft < 3) {
            res.setAction("BUY");
            res.setMessage("2-3 rojullo ayipothundi → Konandi");
        } else if (daysLeft <= 7) {
            res.setAction("WATCH");
            res.setMessage("Stock taggutundi → Choodandi");
        } else {
            res.setAction("OK");
            res.setMessage("Stock saripothundi");
        }

        return res;

    } catch (Exception e) {
        throw new RuntimeException("ML service unavailable: " + e.getMessage());
    }
}


 public List<ItemRecommendationDecision> getRecommendations(Long retailerId) {

    try {
        String url = mlServiceUrl + "/recommendations/" + retailerId;

        RecommendationResponse response =
                restTemplate.getForObject(url, RecommendationResponse.class);

        List<ItemRecommendationDecision> result = new ArrayList<>();

        for (RecommendationResponse.Recommendation r : response.getRecommendations()) {

            Item item = itemRepository.findById(r.getItemId())
                    .orElse(null);

            if (item == null) continue;

            ItemRecommendationDecision decision = new ItemRecommendationDecision();

            decision.setItemId(r.getItemId());
            decision.setItemName(r.getItemName());
            decision.setCategory(r.getCategory());

            double stock = item.getCurrentStock() != null
                    ? item.getCurrentStock().doubleValue()
                    : 0;

            decision.setStock(stock);

            // SIMPLE LOGIC (convert ML → human)
            if ("Strong Buy".equalsIgnoreCase(r.getAction())) {
                decision.setAction("BUY");
                decision.setMessage("Demand perigindi → Konandi");
            } else if ("Consider Buying".equalsIgnoreCase(r.getAction())) {
                decision.setAction("WATCH");
                decision.setMessage("Konchem penchandi");
            } else if ("Reduce Stock".equalsIgnoreCase(r.getAction())) {
                decision.setAction("REDUCE");
                decision.setMessage("Demand taggindi → Tagginchandi");
            } else {
                decision.setAction("OK");
                decision.setMessage("Stable demand");
            }

            result.add(decision);
        }

        return result;

    } catch (Exception e) {
        throw new RuntimeException("ml service unavailable " + e.getMessage());
    }
} 

  public List<CategoryTrendDecision> getTrends(Long retailerId) {

      try {
          String url = mlServiceUrl + "/trends/" + retailerId;

          TrendResponse response =
                  restTemplate.getForObject(url, TrendResponse.class);

          List<CategoryTrendDecision> result = new ArrayList<>();

          for (TrendResponse.Trend t : response.getTrends()) {

              CategoryTrendDecision decision = new CategoryTrendDecision();

              decision.setCategory(t.getCategory());
              decision.setGrowthRate(t.getGrowthRate());

              if ("Rising".equalsIgnoreCase(t.getTrend())) {
                  decision.setTrend("RISING");
                  decision.setMessage("Demand perigindi → Ekkuva stock pettandi");
              } else if ("Falling".equalsIgnoreCase(t.getTrend())) {
                  decision.setTrend("FALLING");
                  decision.setMessage("Demand taggindi → Jagratta");
              } else {
                  decision.setTrend("STABLE");
                  decision.setMessage("Demand stable ga undi");
              }

              result.add(decision);
          }

          return result;

      } catch (Exception e) {
          throw new RuntimeException("ml service unavailable " + e.getMessage());
      }
  }

}
  
