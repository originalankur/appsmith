package com.appsmith.server.configurations;

import com.appsmith.server.constants.Appsmith;
import com.appsmith.server.domains.Config;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.exceptions.AppsmithError;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.services.ConfigService;
import com.appsmith.server.solutions.ReleaseNotesService;
import io.sentry.Sentry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Objects;

@Slf4j
@RequiredArgsConstructor
@Component
public class InstanceConfig implements ApplicationListener<ApplicationReadyEvent> {

    private final ConfigService configService;

    private final CloudServicesConfig cloudServicesConfig;

    private final ReactiveRedisTemplate<String, String> reactiveTemplate;

    private final ReleaseNotesService releaseNotesService;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent applicationReadyEvent) {
        System.out.println("\n\nNAYAN on applicationReadyEvent\n\n");

        configService.getByName(Appsmith.APPSMITH_REGISTERED)
                .filter(config -> Boolean.TRUE.equals(config.getConfig().get("value")))
                .switchIfEmpty(registerInstance())
                .doOnSuccess(ignored -> this.printReady())
                .doOnError(ignored -> this.printReady())
                .then(publishReleaseVersionToRedis())
                .subscribe(null, e -> {
                    log.debug(e.getMessage());
                    Sentry.captureException(e);
                });
    }

    private Mono<Long> publishReleaseVersionToRedis() {
        String releaseVersion = releaseNotesService.getReleasedVersion();
        return reactiveTemplate.convertAndSend("currentApiVersion", releaseVersion);
    }

    private Mono<? extends Config> registerInstance() {

        log.debug("Triggering registration of this instance...");

        final String baseUrl = cloudServicesConfig.getBaseUrl();
        if (baseUrl == null || StringUtils.isEmpty(baseUrl)) {
            return Mono.error(new AppsmithException(
                    AppsmithError.INSTANCE_REGISTRATION_FAILURE, "Unable to find cloud services base URL")
            );
        }

        return configService
                .getInstanceId()
                .flatMap(instanceId -> WebClient
                        .create(baseUrl + "/api/v1/installations")
                        .post()
                        .body(BodyInserters.fromValue(Map.of("key", instanceId)))
                        .exchange())
                .flatMap(clientResponse -> clientResponse.toEntity(new ParameterizedTypeReference<ResponseDTO<String>>() {
                }))
                .flatMap(responseEntity -> {
                    if (responseEntity.getStatusCode().is2xxSuccessful()) {
                        return Mono.justOrEmpty(responseEntity.getBody());
                    }
                    return Mono.error(new AppsmithException(
                            AppsmithError.INSTANCE_REGISTRATION_FAILURE,
                            Objects.requireNonNull(responseEntity.getBody()).getResponseMeta().getError().getMessage()));
                })
                .flatMap(instanceId -> configService
                        .save(Appsmith.APPSMITH_REGISTERED, Map.of("value", true))
                );
    }

    private void printReady() {
        System.out.println(
                "\n" +
                " █████╗ ██████╗ ██████╗ ███████╗███╗   ███╗██╗████████╗██╗  ██╗    ██╗███████╗    ██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗██╗███╗   ██╗ ██████╗ ██╗\n" +
                "██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗ ████║██║╚══██╔══╝██║  ██║    ██║██╔════╝    ██╔══██╗██║   ██║████╗  ██║████╗  ██║██║████╗  ██║██╔════╝ ██║\n" +
                "███████║██████╔╝██████╔╝███████╗██╔████╔██║██║   ██║   ███████║    ██║███████╗    ██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║██║██╔██╗ ██║██║  ███╗██║\n" +
                "██╔══██║██╔═══╝ ██╔═══╝ ╚════██║██║╚██╔╝██║██║   ██║   ██╔══██║    ██║╚════██║    ██╔══██╗██║   ██║██║╚██╗██║██║╚██╗██║██║██║╚██╗██║██║   ██║╚═╝\n" +
                "██║  ██║██║     ██║     ███████║██║ ╚═╝ ██║██║   ██║   ██║  ██║    ██║███████║    ██║  ██║╚██████╔╝██║ ╚████║██║ ╚████║██║██║ ╚████║╚██████╔╝██╗\n" +
                "╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝╚═╝     ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚═╝╚══════╝    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝\n" +
                "\n" +
                "Please open http://localhost:<port> in your browser to experience Appsmith!\n"
        );
    }

}
