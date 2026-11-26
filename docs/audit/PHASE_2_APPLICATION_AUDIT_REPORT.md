# Báo cáo audit Phase 2 — Governance Hub

Ngày audit: 26/11/2026 UTC  
Project: `/Users/ploggvn/Documents/ai-decision-governance-service`  
Tài liệu chính: Library `Phase_2_Application_Governance_Hub_Revised.docx` (`libfile_3ad26b9be7888191b4c8a0e00cdba846`)  
Tài liệu thiết kế: `/Users/ploggvn/Downloads/Thiet_ke_Backend_AI_Governance_Canada.docx`

## 1. Kết luận điều hành

Source hiện tại là một frontend Next.js/TypeScript proof of concept có dữ liệu synthetic và một số mock workflow được kiểm thử tốt ở cấp hàm. Nó không phải backend AI governance service đã tích hợp. Không có FastAPI, PostgreSQL, migrations, Docker/Compose, OIDC/RBAC/ABAC, connector server, provider integration hay database runtime trong repository.

Các kiểm tra tĩnh đã đạt: build production, TypeScript, 16 domain tests, 34 monitoring tests, 60 cặp contrast, format và monitoring contract generation. Browser/E2E không được tính là đạt vì môi trường không khởi động ổn định Next dev (`EMFILE` watcher errors). Kịch bản quan trọng 365 ngày → 90 ngày có fixture/oracle cô lập nhưng chưa chạy qua product backend.

Theo challenge chính thức, Phase 2 chỉ nhận giải pháp TRL 5–9; evidence hiện tại chưa đủ để chứng minh mức đó. Đây là đánh giá bằng evidence repository, không phải quyết định TRL chính thức.

## 2. Inventory hiện tại

- 15 business routes được khai báo.
- 41 frontend source files.
- 8 systems, 3 policies, 5 requirements, 6 assessments, 3 evidence records, 3 tasks và 3 audit events trong seed.
- 50 Node test cases pass.
- 113 Playwright tests được phát hiện nhưng chưa execute.
- Backend/database/container/CI: không tìm thấy.
- Monitoring mặc định: demo; live chỉ là client adapter tới API/SSE dự kiến.

## 3. Essential Outcomes

E1 và E4/E5 có mock workflow và pure-domain tests; E2 có typed client contract/SSE transport; E3 chỉ có UI workspace filtering; E6 chỉ có synthetic monitoring metrics. Không outcome nào có đủ backend, authorization, durable evidence và runtime integration để kết luận đã hoàn thành.

## 4. Additional Outcomes

A1 chưa có deployment artifacts. A2 có bilingual model/labels nhưng rendered runtime chưa execute. A3 là localStorage demo tenant separation. A4 có CSV và simulated integrations, chưa có ticket/webhook/notification service.

## 5. Test data

Dữ liệu hiện tại đủ cho demo UI, outcome aggregation, review rationale, event dedup/order, tenant demo filtering và connection/monitoring states. Dữ liệu thiếu gồm policy versions/control mappings, framework corpus, UNKNOWN/conflicting evidence, metric gold sets, connector replay/DLQ, authorization identities và real telemetry. Fixture E1 được thêm trong `docs/audit/evidence/synthetic/` theo yêu cầu cho phép tạo sample data, nhưng được đánh dấu không chạy qua product backend.

## 6. Test execution

| Nhóm | Kết quả |
|---|---|
| TypeScript | PASS |
| Production build | PASS |
| Domain | 16/16 PASS |
| Monitoring | 34/34 PASS |
| Contrast | 60/60 PASS |
| Format | PASS |
| Monitoring contract | PASS |
| Playwright enumeration | 113 listed |
| Playwright runtime | BLOCKED/NOT PASSED |
| API/database/security/performance | NOT AVAILABLE |

Raw evidence nằm trong `docs/audit/evidence/`.

## 7. Critical governance scenario

Không thể thực hiện bước publish policy, impact run, stale marking, reassessment theo tuổi evidence hoặc backend audit export vì các API/domain đó chưa tồn tại. Standalone oracle của fixture cho kết quả đúng theo đề: SYS-A affected, SYS-B/SYS-C unaffected, new NOT_MET, old snapshot preserved. Đây là oracle của dữ liệu, không phải bằng chứng product.

## 8. Mock versus real

| Capability | Kết luận |
|---|---|
| UI registry/policies/assessments/evidence/review | Mock/local browser workflow |
| Governance persistence | localStorage |
| Monitoring demo | browser timer/synthetic events |
| Monitoring live | client contract only; no server |
| AI provider integration | none |
| Authentication/security | none |
| Database/backend | none |
| Reports | browser CSV only |

## 9. P0 tasks

1. Xây tenant-scoped FastAPI/PostgreSQL foundation với OIDC/RBAC/ABAC và migrations.
2. Xây versioned policy/requirement/control graph và impact-run backend, chạy fixture E1.
3. Xây evidence artifact/provenance/expiry/UNKNOWN service.
4. Tạo evidence package để chứng minh TRL 5 trong môi trường mô phỏng có kiểm soát.

## 10. Trả lời sáu câu hỏi bắt buộc

1. Source hiện tại chỉ hỗ trợ một phần các claim; hỗ trợ tốt nhất là UI và mock/synthetic logic.
2. Registry, assessment, evidence, monitoring và integrations đều có phần dữ liệu mock; monitoring demo không phải telemetry AI thật.
3. Chưa đủ test data cho policy impact, backend security, framework corpus, metrics, connectors và real telemetry.
4. Thiếu E1 backend E2E, UNKNOWN/evidence boundaries, auth/RLS, connector replay/DLQ, metric benchmark, rendered browser/axe và deployment tests.
5. Cần triển khai backend/persistence/security trước, sau đó policy impact/assessment/evidence, connectors, risk evaluator và integrated runtime evidence.
6. Cần commit/build logs, backend/API/database evidence, security negatives, connector contracts, labelled datasets, browser/axe screenshots, controlled simulated/pilot validation, staffing/funding/IP/deployment documents.

## Evidence index

Detailed reports: `01_REPOSITORY_INVENTORY.md` through `16_APPLICATION_RECOMMENDED_CORRECTIONS.md`. Machine-readable matrices: `test-data-inventory.csv` and `requirement-traceability-matrix.csv`. Raw command summaries and synthetic fixture: `evidence/`.

The official challenge page identifies the mandatory outcomes and the Phase 2 TRL 5–9 entry requirement: https://www.ised-isde.canada.ca/site/innovative-solutions-canada/en/artificial-intelligence-ai-decision-making-process-visibility-traceability-and-compliance-governance
