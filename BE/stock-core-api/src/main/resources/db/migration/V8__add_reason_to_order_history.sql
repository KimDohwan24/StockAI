-- order_history 테이블에 AI 매수/매도 판단 사유(reason) 컬럼 추가
ALTER TABLE order_history ADD COLUMN reason VARCHAR(1000);
