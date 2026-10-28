import { useForm, Controller } from "react-hook-form";
import type { ProductFormData } from "../productTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductShcema } from "../productSchema";
import { styles } from "./ProductForm.styles";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import FormLabel from "@mui/material/FormLabel";
import { db } from "../../../services/db/database";
import { useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useNavigate } from "@tanstack/react-router";

export default function ProductForm(){
    const{control, handleSubmit, reset,
        formState:{isSubmitted, isValid, isSubmitting}} = useForm<ProductFormData>({resolver: zodResolver(ProductShcema),
        defaultValues:{name:"", price:0, description:""}, mode:"onSubmit", reValidateMode:"onChange"
    });

    const[snackBar, setSnackBar] = useState({open:false, message:"", 
        severity:"success" as "success" | "error"});

    const navigate = useNavigate()

    async function onValidSubmit(data:ProductFormData){
        try {
            await db.productsStore.add(data);

            setSnackBar({open:true,
                message: "Product added successfully", severity:"success"
            })

            reset();
            
        } catch (error) {
            setSnackBar({open:true,
                message: "Failed to add product", severity:"success"
            })
            console.log(error)
        }
    }

    function closeSnackBar() {
        setSnackBar(previous => ({...previous, open:false}))
    }

    return(
        <>
            <Box component="section" sx={styles.layout}>
                <Button onClick={async() => await navigate({to:"/admin/categories"

                })}>
                    Add Category
                </Button>

                <Box>
                    <Typography component="h2" variant="h3" sx={styles.heading}>
                        Add a new product
                    </Typography>

                    <Typography sx={styles.description}>
                        Start with a name, set a price, and add a description
                        that helps customers understand your product.
                    </Typography>
                </Box>

                <Paper elevation={0} sx={styles.card}>
                    <Box
                        component="form"
                        onSubmit={handleSubmit(onValidSubmit)}
                        sx={styles.form}>
                            <Stack spacing={3}>
                                <Typography component="h3" variant="h6" sx={styles.formTitle}>
                                    Product details
                                </Typography>

                                <Controller control={control} name="name" render={({field: {ref, ...field}, fieldState}) => (
                                    <Box sx={styles.fieldGroup}>
                                        <FormLabel htmlFor="product-name" error={!!fieldState.error} sx={styles.fieldLabel}>
                                            Product name
                                        </FormLabel>
                                        <TextField
                                            {...field}
                                            inputRef={ref}
                                            id="product-name"
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            sx={styles.textField}
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    </Box>
                                )}/>

                                <Controller control={control} name="price" render={({field, fieldState}) =>(
                                    <Box sx={styles.fieldGroup}>
                                        <FormLabel htmlFor="product-price" error={!!fieldState.error} sx={styles.fieldLabel}>
                                            Product price
                                        </FormLabel>
                                        <TextField
                                            name={field.name}
                                            inputRef={field.ref}
                                            id="product-price"
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            sx={styles.textField}
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            type="number"
                                            value={field.value ?? ""}
                                            onBlur={field.onBlur}
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                field.onChange(value === "" ? undefined : Number(value));
                                            }}
                                        />
                                    </Box>
                                )}/>

                                <Controller control={control} name="description" render={({field: {ref, ...field}, fieldState}) =>(
                                    <Box sx={styles.fieldGroup}>
                                        <FormLabel htmlFor="product-description" error={!!fieldState.error} sx={styles.fieldLabel}>
                                            Description
                                        </FormLabel>
                                        <TextField
                                            {...field}
                                            inputRef={ref}
                                            id="product-description"
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            sx={styles.textField}
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    </Box>
                                )}/>


                                <Button type="submit" variant="contained" sx={styles.submitButton}
                                disabled={(isSubmitted && !isValid) || isSubmitting}
                                >Submit</Button>
                            
                            </Stack>
                    </Box>
                </Paper>
            </Box>

            <Snackbar
                open={snackBar.open}
                autoHideDuration={6000}
                onClose={closeSnackBar}
                anchorOrigin={{
                vertical: "bottom",
                horizontal: "center"
                }}
            >
            <Alert
                severity={snackBar.severity}
                onClose={closeSnackBar}
            >
            {snackBar.message}
            </Alert>
        </Snackbar>
        </>
    );
}
