package com.stock.infrastructure.dto.kis;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;

import java.io.IOException;

public class BalanceSummaryDeserializer extends JsonDeserializer<BalanceSummary> {

    @Override
    public BalanceSummary deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        ObjectCodec codec = p.getCodec();
        JsonNode node = codec.readTree(p);

        if (node == null || node.isNull()) {
            return null;
        }

        if (node.isArray()) {
            if (node.size() > 0) {
                return codec.treeToValue(node.get(0), BalanceSummary.class);
            }
            return null;
        }

        return codec.treeToValue(node, BalanceSummary.class);
    }
}
