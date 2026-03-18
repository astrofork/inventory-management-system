package com.kirana.mlService;


import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.beans.factory.annotation.Value;
import com.kirana.entity.Item;
import com.kirana.mlDto.ForecastResponse;
import com.kirana.mlDto.RecommendationResponse;
import com.kirana.mlDto.TrendResponse;
import com.kirana.repository.ItemRepository;

import lombok.RequiredArgsConstructor;

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




  public ForecastResponse getItemForecast(long itemId, int days,long retailerId){


    Item item = itemRepository.findByIdAndRetailerIdAndDeletedAtIsNull(itemId, retailerId)
      .orElseThrow(()-> new RuntimeException("Item is not found or unauthorized"));
    try{
      String url = mlServiceUrl + "/forecast/item/" + item.getId() + "?days=" + days + "&retailer_id=" + item.getRetailerId();
      return restTemplate.getForObject(url, ForecastResponse.class);
    }catch(Exception e){
      throw new RuntimeException("Ml service unavailable" + e.getMessage());
    }

  }

  public RecommendationResponse getRecommendations(Long retailerId){
    try{
      String url = mlServiceUrl + "/recommendations/" + retailerId;
      System.out.println(url);
      return restTemplate.getForObject(url, RecommendationResponse.class);
    }catch(Exception e){
      throw new RuntimeException("ml service unavailable" + e.getMessage());
    }
  }

  public TrendResponse getTrends(Long retailerId){

    try{
      String url = mlServiceUrl + "/trends/" + retailerId;
      return restTemplate.getForObject(url, TrendResponse.class);
    }catch(Exception e){
      throw new RuntimeException("ml service unavailable" + e.getMessage());
    }
  }
  
}
