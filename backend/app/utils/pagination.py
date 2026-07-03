from sqlalchemy import select, func


def paginate(
        db,
        model,
        page=1,
        page_size=20):

    total = db.scalar(
        select(
            func.count()
        ).select_from(model)
    )

    items = db.scalars(

        select(model)

        .offset(
            (page - 1) * page_size
        )

        .limit(page_size)

    ).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }